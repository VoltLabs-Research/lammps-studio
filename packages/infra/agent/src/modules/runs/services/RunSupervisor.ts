import RunOutput from './RunOutput';
import RunSession from './RunSession';
import EntryScriptService from '@/modules/simulations/services/EntryScript';
import MachineService from '@/modules/machines/services/Machine';
import RunHistoryService from '@/modules/simulations/services/RunHistory';
import ScriptFilesService from '@/modules/simulations/services/ScriptFiles';
import SimulationStoreService from '@/modules/simulations/services/SimulationStore';
import { builds } from '@/modules/builds/services/Build';
import { PreparedBuild } from '@/modules/builds/contracts/domain/build';
import { buildOutputOf } from '@/modules/builds/utils/buildOutput';
import { RunError } from '../contracts/domain/errors';
import { buildFailedLine, buildingLine, notStartedLine, startedLine } from '../utils/metaLines';
import { MachineError } from '@/modules/machines/contracts/domain/errors';
import { StoredSimulation } from '@/modules/simulations/contracts/domain/simulation';
import { outputDirOf, runDirOf } from '@/modules/simulations/utils/layout';
import { readTextIfExists } from '@/shared/utils/fsErrors';
import { Run, RunConfig } from '@lammps-studio/contracts/run/domain';
import { ScriptRun } from '@lammps-studio/contracts/script/domain';
import LogReader from '@lammps-studio/lammps/log/LogReader';
import { sectionProgress } from '@lammps-studio/lammps/log/section-progress';
import { analyseScript } from '@lammps-studio/lammps/script/analyse-script';
import { logger } from '@lammps-studio/readable/utils/Logger';
import { BuildSpec } from '@lammps-studio/runtime/domain/build/BuildSpec';
import { PreparedRun, runIdOf, RunSpec } from '@lammps-studio/runtime/domain/simulation/RunSpec';
import LammpsRuntime from '@lammps-studio/runtime/public/LammpsRuntime';
import { join, posix } from 'node:path';

const SCOPE = 'runs';

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

const newRun = (simulationId: string, config: RunConfig, build: PreparedBuild, number: number): Run => ({
    simulationId,
    number,
    state: build.ready ? 'starting' : 'building',
    startedAt: new Date().toISOString(),
    endedAt: null,
    progress: { ...sectionProgress(new LogReader(), []), stepsPerSecond: null },
    error: null,
    config,
    buildHash: build.identity.hash,
    outputDir: outputDirOf(number),
    frames: 0,
    warnings: 0
});

const runSpecOf = (stored: StoredSimulation, config: RunConfig, image: string, prepared: PreparedRun): RunSpec => ({
    image,
    simulationId: stored.record.id,
    simulationDir: stored.path,
    run: prepared,
    execution: {
        mpiRanks: config.mpiRanks,
        threadsPerRank: config.threadsPerRank,
        gpus: config.gpus,
        accelerator: config.accelerator
    },
    variables: config.variables
});

export default class RunSupervisorService{
    #opened: LammpsRuntime | null = null;
    #sessions = new Map<string, RunSession>();
    #reserved = new Set<string>();
    #unsubscribe: Array<() => void> = [];
    #store = new SimulationStoreService();
    #history = new RunHistoryService();
    #entries = new EntryScriptService();
    #scripts = new ScriptFilesService();
    #machines = new MachineService();

    async open(runtime: LammpsRuntime){
        this.#opened = runtime;
        this.#unsubscribe = this.#listen(runtime);
    }

    async close(){
        this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
        this.#unsubscribe = [];
        this.#opened = null;
        const sessions = [...this.#sessions.values()];
        this.#sessions.clear();
        this.#reserved.clear();
        await Promise.all(sessions.map((session) => session.detach()));
    }

    runtime(): LammpsRuntime{
        if(this.#opened === null) throw MachineError.Offline();

        return this.#opened;
    }

    session(simulationId: string, runNumber: number): RunSession | undefined{
        return this.#sessions.get(runIdOf(simulationId, runNumber));
    }

    async start(simulationId: string, config: RunConfig): Promise<Run>{
        const stored = await this.#store.find(simulationId);
        this.#machines.assertKnown(config.machineId);
        const entry = await this.#entries.validate(stored.path, config.entry);

        this.#reserve(simulationId);
        try{
            return await this.#launch(stored, { ...config, entry });
        }finally{
            this.#reserved.delete(simulationId);
        }
    }

    async stop(simulationId: string, runNumber: number, kill: boolean): Promise<Run>{
        const session = this.session(simulationId, runNumber);
        if(!session || session.isFinal){
            await this.#requireRun(simulationId, runNumber);
            throw RunError.NotRunning();
        }

        session.requestStop(kill);
        if(session.hasContainer) await this.#halt(session);
        return session.run;
    }

    #reserve(simulationId: string){
        const active = [...this.#sessions.values()].some((session) => session.run.simulationId === simulationId);
        if(active || this.#reserved.has(simulationId)) throw RunError.AlreadyRunning();

        this.#reserved.add(simulationId);
    }

    async #launch(stored: StoredSimulation, config: RunConfig): Promise<Run>{
        const runtime = this.runtime();
        const spec: BuildSpec = {
            version: config.version,
            packages: config.packages
        };
        const build = await builds.prepare(spec);
        const machine = await this.#machines.get(config.machineId);
        const prepared = await runtime.prepareRun(stored.path, config.entry);

        const session = await this.#register(stored, newRun(stored.record.id, config, build, prepared.number), new RunOutput());
        session.note(startedLine(prepared.number, machine.name, build.identity.hash));
        if(!build.ready) session.note(buildingLine(config));
        await session.begin();

        this.#execute(session, build.ready, spec, runSpecOf(stored, config, build.identity.tag, prepared)).catch((error: unknown) => {
            logger.error('Could not carry the run through', error, { scope: SCOPE, run: session.runtimeId });
        });
        return session.run;
    }

    async #execute(session: RunSession, ready: boolean, spec: BuildSpec, runSpec: RunSpec){
        if(!ready && !(await this.#built(session, spec))) return;
        if(session.stopRequest !== 'none'){
            session.cancel();
            return;
        }

        session.toStarting();
        if(!(await this.#started(session, runSpec))) return;
        if(session.stopRequest !== 'none') await this.#halt(session);
    }

    async #built(session: RunSession, spec: BuildSpec): Promise<boolean>{
        try{
            await builds.ensure(spec, session.building.signal);
            return true;
        }catch(error: unknown){
            const output = buildOutputOf(messageOf(error));
            session.fail(`The LAMMPS build failed: ${output}`, buildFailedLine(output));
            return false;
        }
    }

    async #started(session: RunSession, runSpec: RunSpec): Promise<boolean>{
        try{
            await this.runtime().run(runSpec);
            return true;
        }catch(error: unknown){
            session.fail(messageOf(error), notStartedLine(messageOf(error)));
            return false;
        }
    }

    async #halt(session: RunSession){
        const runtime = this.runtime();
        if(session.stopRequest === 'kill'){
            await runtime.kill(session.runtimeId);
            return;
        }

        await runtime.stop(session.runtimeId);
    }

    #listen(runtime: LammpsRuntime): Array<() => void>{
        const sessionOf = (runId: string) => this.#sessions.get(runId);

        return [
            runtime.on('simulation:stdout', ({ runId, line }) => sessionOf(runId)?.print(line)),
            runtime.on('simulation:stderr', ({ runId, line }) => sessionOf(runId)?.print(line)),
            runtime.on('dump:frame', (frame) => sessionOf(frame.runId)?.frame(frame)),
            runtime.on('simulation:state', ({ runId, state, snapshot }) => {
                if(state === 'starting' && snapshot.containerId !== null) sessionOf(runId)?.attached(snapshot.containerId);
            }),
            runtime.on('simulation:start', ({ runId }) => sessionOf(runId)?.toRunning()),
            runtime.on('simulation:end', ({ runId, exitCode, snapshot }) => sessionOf(runId)?.ended(exitCode, snapshot.errorMessage))
        ];
    }

    async #register(stored: StoredSimulation, run: Run, output: RunOutput): Promise<RunSession>{
        const runDir = runDirOf(stored.path, run.number);
        const session = new RunSession({
            run,
            location: {
                simulationId: stored.record.id,
                folder: stored.path,
                runDir,
                plan: await this.#plan(stored.path, run.config, runDir)
            },
            output,
            runtime: this.runtime(),
            settled: (done) => this.#forget(done)
        });

        this.#sessions.set(session.runtimeId, session);
        return session;
    }

    #forget(session: RunSession){
        if(this.#sessions.get(session.runtimeId) === session) this.#sessions.delete(session.runtimeId);
    }

    async #plan(folder: string, { entry, variables }: RunConfig, runDir: string): Promise<ScriptRun[]>{
        const files = await this.#scripts.read(folder);
        const copy = await readTextIfExists(join(runDir, posix.basename(entry)));
        const script = files.map((file) => (file.path === entry && copy !== null ? { ...file, text: copy } : file));

        return analyseScript(entry, script, variables).runs;
    }

    async #requireRun(simulationId: string, runNumber: number){
        const stored = await this.#store.find(simulationId);
        if((await this.#history.find(stored.path, runNumber)) === null) throw RunError.NotFound();
    }
}

export const runSupervisor = new RunSupervisorService();
