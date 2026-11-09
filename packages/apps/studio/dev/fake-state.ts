import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { FrameInfo } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { liveCuRun, pastCuRuns } from './fake-cu-history';
import { CU_SIMULATION_ID, TENSION } from './fake-cu-run';
import { BUILDS, MACHINES, RUNS, SIMULATIONS } from './fake-data';
import { FakeFile, isUnder, runFiles, seededFolders } from './fake-folders';
import { recordOf, RunRecord } from './fake-runs';

export interface FakeState{
    machines: Machine[];
    simulations: Simulation[];
    runs: Map<string, RunRecord[]>;
    builds: Build[];
    folders: Map<string, FakeFile[]>;
    removed: Map<string, string[]>;
    live: boolean;
}

const CU_LIVE_STEP = 184000;

export const createState = (): FakeState => {
    const now = Date.now();
    const cuRuns = [...pastCuRuns(MACHINES, now), liveCuRun(MACHINES, now, { section: TENSION, step: CU_LIVE_STEP })];
    const runs = new Map(RUNS.map((run) => [run.simulationId, [recordOf(run)]]));
    runs.set(CU_SIMULATION_ID, cuRuns);

    return {
        machines: MACHINES,
        simulations: SIMULATIONS,
        runs,
        builds: BUILDS,
        folders: seededFolders(now),
        removed: new Map(),
        live: true
    };
};

export const recordsOf = (state: FakeState, simulationId: string): RunRecord[] => state.runs.get(simulationId) ?? [];

export const latestRecords = (state: FakeState): RunRecord[] => [...state.runs.values()].flatMap((records) => records.slice(-1));

export const latestRecord = (state: FakeState, simulationId: string): RunRecord | null => recordsOf(state, simulationId).at(-1) ?? null;

export const findRecord = (state: FakeState, simulationId: string, runNumber: string): RunRecord | null =>
    recordsOf(state, simulationId).find((record) => String(record.run.number) === runNumber) ?? null;

export const latestFrame = (state: FakeState, simulationId: string): FrameInfo | null => recordsOf(state, simulationId).flatMap((record) => record.frames).at(-1) ?? null;

export const filesOf = (state: FakeState, simulationId: string): FakeFile[] => {
    const removed = state.removed.get(simulationId) ?? [];
    const files = [...(state.folders.get(simulationId) ?? []), ...recordsOf(state, simulationId).flatMap(runFiles)];

    return files.filter((file) => !removed.some((path) => isUnder(file.path, path)));
};
