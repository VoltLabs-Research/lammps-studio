import RunFiles from './RunFiles';
import RunOutput from './RunOutput';
import RunPreview from './RunPreview';
import StepRate from './StepRate';
import SimulationService from '@/modules/simulations/services/Simulation';
import { RunLocation, StopRequest } from '../contracts/domain/run';
import { completedLine, containerLines, exitedLine, killedLine, lostLine, notStartedLine, stopRequestedLine, stoppedLine, terminatedLine } from '../utils/metaLines';
import { PREVIEW_FILE, STUDIO_DIR } from '@/modules/simulations/utils/layout';
import { eventBus } from '@/shared/events/EventBus';
import { RunThermoFrame } from '@lammps-studio/contracts/events/gateway';
import { Run, RunError, RunState } from '@lammps-studio/contracts/run/domain';
import { ThermoRow } from '@lammps-studio/lammps/log/domain';
import { sectionProgress } from '@lammps-studio/lammps/log/section-progress';
import { logger } from '@lammps-studio/readable/utils/Logger';
import { DumpFrame } from '@lammps-studio/runtime/domain/dump/DumpFrame';
import { runIdOf } from '@lammps-studio/runtime/domain/simulation/RunSpec';
import LammpsRuntime from '@lammps-studio/runtime/public/LammpsRuntime';
import { join } from 'node:path';

export const FLUSH_MS = 100;
export const PROGRESS_MS = 1000;

const FINAL_STATES: RunState[] = ['cancelled', 'completed', 'failed'];
const MS_PER_SECOND = 1000;
const UNKNOWN_FAILURE = 'The run ended without an exit code';

type LiveFields = Pick<Run, 'progress' | 'warnings' | 'frames'>;

export type SessionSettled = (session: RunSession) => void;

export interface RunSessionOptions{
    run: Run;
    location: RunLocation;
    output: RunOutput;
    runtime: LammpsRuntime;
    settled: SessionSettled;
}

export const isFinal = (state: RunState): boolean => FINAL_STATES.includes(state);

const thermoFramesOf = (simulationId: string, runNumber: number, rows: ThermoRow[]): RunThermoFrame[] => {
    const frames = new Map<number, RunThermoFrame>();
    for(const { section, columns, values } of rows){
        const frame = frames.get(section) ?? { type: 'run:thermo', simulationId, runNumber, section, columns, rows: [] };
        frame.rows.push(values);
        frames.set(section, frame);
    }

    return [...frames.values()];
};

const sameLive = (a: LiveFields, b: LiveFields): boolean => {
    return JSON.stringify([a.progress, a.warnings, a.frames]) === JSON.stringify([b.progress, b.warnings, b.frames]);
};

export default class RunSession{
    readonly output: RunOutput;
    readonly runtimeId: string;
    readonly building = new AbortController();
    readonly #location: RunLocation;
    readonly #files: RunFiles;
    readonly #preview: RunPreview;
    readonly #settled: SessionSettled;
    readonly #rate = new StepRate();
    readonly #simulations = new SimulationService();
    #run: Run;
    #stop: StopRequest = 'none';
    #container: string | null = null;
    #flushTimer: NodeJS.Timeout | null = null;
    #announceTimer: NodeJS.Timeout | null = null;
    #announcedAt = 0;
    #tasks = Promise.resolve();

    constructor({ run, location, output, runtime, settled }: RunSessionOptions){
        this.output = output;
        this.runtimeId = runIdOf(location.simulationId, run.number);
        this.#location = location;
        this.#files = new RunFiles(location.runDir);
        this.#preview = new RunPreview(runtime, join(location.folder, STUDIO_DIR, PREVIEW_FILE), () => this.#enqueue(() => this.#announceSimulation()));
        this.#settled = settled;
        this.#run = run;
    }

    get run(): Run{
        return this.#run;
    }

    get stopRequest(): StopRequest{
        return this.#stop;
    }

    get hasContainer(): boolean{
        return this.#container !== null;
    }

    get isFinal(): boolean{
        return isFinal(this.#run.state);
    }

    async begin(){
        this.#run = { ...this.#run, ...this.#live() };
        await this.#files.save(this.#run);
        eventBus.emit({ type: 'run:updated', run: this.#run });
        this.#flush();
        this.#enqueue(() => this.#announceSimulation());
    }

    note(line: string){
        this.output.meta(line);
        this.#schedule();
    }

    print(line: string){
        this.output.container(line);
        this.#schedule();
    }

    frame(frame: DumpFrame){
        this.output.frame(frame);
        this.#schedule();
    }

    attached(containerId: string){
        this.#container = containerId;
        containerLines(containerId, this.#run.config, this.#run.buildHash).forEach((line) => this.output.meta(line));
        this.#schedule();
    }

    toStarting(){
        if(this.#run.state === 'building') this.#transition({ state: 'starting' });
    }

    toRunning(){
        if(this.#run.state === 'starting') this.#transition({ state: 'running' });
    }

    requestStop(kill: boolean){
        const request: StopRequest = kill ? 'kill' : 'term';
        if(this.#stop === request || this.#stop === 'kill') return;

        this.#stop = request;
        this.building.abort();
        this.output.meta(kill ? killedLine(this.output.reader.lastStep) : stopRequestedLine());
        this.#transition({ state: 'stopping' });
    }

    ended(exitCode: number | null, message: string | null){
        if(exitCode !== null){
            this.#exited(exitCode);
            return;
        }

        const reason = message ?? UNKNOWN_FAILURE;
        const running = this.#run.state === 'running' || this.#run.state === 'stopping';
        this.fail(reason, running ? lostLine(reason) : notStartedLine(reason));
    }

    fail(message: string, line: string){
        this.#fail({ message, step: this.output.reader.lastStep, line: null }, line);
    }

    cancel(){
        if(this.isFinal) return;

        this.#settle('cancelled', null, [stoppedLine(this.#run.number)]);
    }

    async detach(){
        this.#flush();
        this.#clearTimers();
        this.#preview.stop();
        await this.#tasks;
    }

    #exited(exitCode: number){
        if(this.isFinal) return;

        const step = this.output.reader.lastStep;
        if(this.#stop === 'term'){
            this.#settle('cancelled', null, [terminatedLine(step), stoppedLine(this.#run.number)]);
        }else if(this.#stop === 'kill'){
            this.#settle('cancelled', null, [stoppedLine(this.#run.number)]);
        }else if(exitCode === 0){
            this.#settle('completed', null, [completedLine(this.#run.number, this.#seconds())]);
        }else{
            const error = this.output.reader.error ?? { message: `LAMMPS exited with code ${exitCode}`, step, line: null };
            this.#settle('failed', error, [exitedLine(exitCode, step)]);
        }
    }

    #fail(error: RunError, line: string){
        if(this.#stop !== 'none'){
            this.cancel();
            return;
        }

        if(!this.isFinal) this.#settle('failed', error, [line]);
    }

    #settle(state: RunState, error: RunError | null, lines: string[]){
        lines.forEach((line) => this.output.meta(line));
        this.#transition({ state, error, endedAt: new Date().toISOString() });
        this.#clearTimers();
        this.#enqueue(async () => this.#settled(this));
    }

    #transition(patch: Partial<Run>){
        const next: Run = { ...this.#run, ...this.#live(), ...patch };
        if(isFinal(next.state)) next.progress = { ...next.progress, stepsPerSecond: null };

        this.#run = next;
        this.#flush();
        this.#announce();
        this.#enqueue(async () => {
            if(isFinal(next.state)) await this.#preview.drain();
            await this.#announceSimulation();
        });
    }

    #schedule(){
        if(this.isFinal || this.#flushTimer !== null) return;

        this.#flushTimer = setTimeout(() => this.#flush(), FLUSH_MS);
    }

    #flush(){
        if(this.#flushTimer !== null) clearTimeout(this.#flushTimer);
        this.#flushTimer = null;
        if(!this.output.pending) return;

        const { lines, rows, frames } = this.output.take();
        const { simulationId } = this.#location;
        const runNumber = this.#run.number;
        if(lines.length > 0){
            eventBus.emit({ type: 'run:log', simulationId, runNumber, lines });
            this.#enqueue(() => this.#files.append(lines));
        }
        thermoFramesOf(simulationId, runNumber, rows).forEach((thermo) => eventBus.emit(thermo));
        frames.forEach((frame) => eventBus.emit({ type: 'run:frame', simulationId, runNumber, frame }));

        const latest = this.output.frames.at(-1);
        if(frames.length > 0 && latest) this.#preview.offer(latest);
        this.#progressed();
    }

    #progressed(){
        const { section, step } = sectionProgress(this.output.reader, this.#location.plan);
        this.#rate.sample(section, step, Date.now());
        if(this.isFinal || sameLive(this.#live(), this.#run)) return;

        const wait = this.#announcedAt + PROGRESS_MS - Date.now();
        if(wait <= 0){
            this.#run = { ...this.#run, ...this.#live() };
            this.#announce();
            return;
        }
        this.#announceTimer ??= setTimeout(() => {
            this.#announceTimer = null;
            this.#progressed();
        }, wait);
    }

    #announce(){
        const run = this.#run;
        if(this.#announceTimer !== null) clearTimeout(this.#announceTimer);
        this.#announceTimer = null;
        this.#announcedAt = Date.now();

        eventBus.emit({ type: 'run:updated', run });
        this.#enqueue(() => this.#files.save(run));
    }

    #live(): LiveFields{
        const progress = sectionProgress(this.output.reader, this.#location.plan);

        return {
            progress: { ...progress, stepsPerSecond: this.#rate.perSecond },
            warnings: this.output.reader.warnings,
            frames: this.output.frames.length
        };
    }

    #seconds(): number{
        return (Date.now() - Date.parse(this.#run.startedAt)) / MS_PER_SECOND;
    }

    #clearTimers(){
        if(this.#flushTimer !== null) clearTimeout(this.#flushTimer);
        if(this.#announceTimer !== null) clearTimeout(this.#announceTimer);
        this.#flushTimer = null;
        this.#announceTimer = null;
    }

    async #announceSimulation(){
        await this.#simulations.announce(this.#location.simulationId);
    }

    #enqueue(task: () => Promise<void>){
        this.#tasks = this.#tasks.then(task).catch((error: unknown) => {
            logger.error('Could not keep the run on disk up to date', error, { scope: 'runs', run: this.runtimeId });
        });
    }
}
