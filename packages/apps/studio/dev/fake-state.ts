import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { FrameInfo } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { CU_SIMULATION_ID } from './fake-cu-run';
import { BUILDS, MACHINES, RUNS, SIMULATIONS } from './fake-data';
import { FakeFile, isUnder, runFiles, seededFolders } from './fake-folders';
import { recordOf, RunRecord } from './fake-runs';
import { cuScenario, Scenario } from './fake-scenarios';

export interface FakeState{
    machines: Machine[];
    simulations: Simulation[];
    runs: Map<string, RunRecord[]>;
    builds: Build[];
    folders: Map<string, FakeFile[]>;
    removed: Map<string, string[]>;
    scenario: Scenario;
    live: boolean;
}

export const createState = (scenario: Scenario, live: boolean): FakeState => {
    const now = Date.now();
    const cu = cuScenario(scenario, MACHINES, now);
    const runs = new Map(RUNS.map((run) => [run.simulationId, [recordOf(run)]]));
    runs.set(CU_SIMULATION_ID, cu.runs);

    return {
        machines: MACHINES,
        simulations: SIMULATIONS,
        runs,
        builds: [...BUILDS, ...cu.builds],
        folders: seededFolders(now),
        removed: new Map(),
        scenario,
        live
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
