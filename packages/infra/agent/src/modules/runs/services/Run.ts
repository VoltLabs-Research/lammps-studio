import RunFiles from './RunFiles';
import { frameInfoOf } from './RunOutput';
import { runSupervisor } from './RunSupervisor';
import RunHistoryService from '@/modules/simulations/services/RunHistory';
import SimulationStoreService from '@/modules/simulations/services/SimulationStore';
import { RunError } from '../contracts/domain/errors';
import { LocatedRun, RunFrame } from '../contracts/domain/run';
import { runDirOf } from '@/modules/simulations/utils/layout';
import { FrameInfo, LogLine, Run, RunConfig, ThermoSection } from '@lammps-studio/contracts/run/domain';
import { encodeFrame } from '@lammps-studio/lammps/dump/frame-codec';
import { parseDumpFrame } from '@lammps-studio/lammps/dump/parse-dump';
import { parseLog } from '@lammps-studio/lammps/log/parse-log';

const WHOLE_NUMBER = /^\d+$/;

const runNumberOf = (value: string): number => {
    if(!WHOLE_NUMBER.test(value)) throw RunError.NotFound();

    return Number(value);
};

export default class RunService{
    #store = new SimulationStoreService();
    #history = new RunHistoryService();

    async list(simulationId: string): Promise<Run[]>{
        const stored = await this.#store.find(simulationId);
        const runs = await this.#history.list(stored.path);

        return runs.map((run) => runSupervisor.session(simulationId, run.number)?.run ?? run);
    }

    start(simulationId: string, config: RunConfig): Promise<Run>{
        return runSupervisor.start(simulationId, config);
    }

    async get(simulationId: string, runNumber: string): Promise<Run>{
        return (await this.#locate(simulationId, runNumber)).run;
    }

    stop(simulationId: string, runNumber: string, kill: boolean): Promise<Run>{
        return runSupervisor.stop(simulationId, runNumberOf(runNumber), kill);
    }

    async log(simulationId: string, runNumber: string): Promise<LogLine[]>{
        const located = await this.#locate(simulationId, runNumber);
        if(located.output) return located.output.lines;

        return parseLog(await new RunFiles(located.runDir).screen()).lines;
    }

    async thermo(simulationId: string, runNumber: string): Promise<ThermoSection[]>{
        const located = await this.#locate(simulationId, runNumber);
        if(located.output) return located.output.reader.sections;

        return parseLog(await new RunFiles(located.runDir).screen()).sections;
    }

    async frames(simulationId: string, runNumber: string): Promise<FrameInfo[]>{
        return (await this.#frames(await this.#locate(simulationId, runNumber))).map(frameInfoOf);
    }

    async frame(simulationId: string, runNumber: string, frameIndex: string): Promise<Buffer>{
        const frames = await this.#frames(await this.#locate(simulationId, runNumber));
        const frame = WHOLE_NUMBER.test(frameIndex) ? frames[Number(frameIndex)] : undefined;
        if(!frame) throw RunError.FrameNotFound();

        const text = await runSupervisor.runtime().readFrame(frame.path, frame.byteOffset);
        return Buffer.from(encodeFrame(parseDumpFrame(text)));
    }

    async #frames({ output, runDir }: LocatedRun): Promise<RunFrame[]>{
        if(output) return output.frames;

        const scanned = await runSupervisor.runtime().scanFrames(runDir);
        return scanned.map(({ path, step, atoms, byteOffset }, index) => ({ index, step, atoms, path, byteOffset }));
    }

    async #locate(simulationId: string, runNumber: string): Promise<LocatedRun>{
        const stored = await this.#store.find(simulationId);
        const number = runNumberOf(runNumber);
        const session = runSupervisor.session(simulationId, number);
        const run = session?.run ?? await this.#history.find(stored.path, number);
        if(!run) throw RunError.NotFound();

        return {
            run,
            output: session?.output ?? null,
            runDir: runDirOf(stored.path, number)
        };
    }
}
