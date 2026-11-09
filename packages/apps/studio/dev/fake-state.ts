import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { liveCuRun, pastCuRuns } from './fake-cu-history';
import { CU_SIMULATION_ID } from './fake-cu-run';
import { BUILDS, MACHINES, RUNS, SIMULATIONS } from './fake-data';
import { recordOf, RunRecord } from './fake-runs';

export interface FakeState{
    machines: Machine[];
    simulations: Simulation[];
    runs: Map<string, RunRecord[]>;
    builds: Build[];
}

const CU_LIVE_STEP = 184000;

export const createState = (): FakeState => {
    const now = Date.now();
    const cuRuns = [...pastCuRuns(MACHINES, now), liveCuRun(MACHINES, now, { section: 2, step: CU_LIVE_STEP })];
    const runs = new Map(RUNS.map((run) => [run.simulationId, [recordOf(run)]]));
    runs.set(CU_SIMULATION_ID, cuRuns);

    return {
        machines: MACHINES,
        simulations: SIMULATIONS,
        runs,
        builds: BUILDS
    };
};

export const recordsOf = (state: FakeState, simulationId: string): RunRecord[] => state.runs.get(simulationId) ?? [];

export const latestRecord = (state: FakeState, simulationId: string): RunRecord | null => recordsOf(state, simulationId).at(-1) ?? null;

export const findRecord = (state: FakeState, simulationId: string, runNumber: string): RunRecord | null =>
    recordsOf(state, simulationId).find((record) => String(record.run.number) === runNumber) ?? null;
