import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Run, RunConfig, RunProgress } from '@lammps-studio/contracts/run/domain';
import { TPS } from './cu/cu-model';
import { configFor } from './fake-data';
import { cancelCu, contextOf, CU_SIMULATION_ID, EQUILIBRATION, missingPackageCu, plannedCuProgress, replayCu, RunPosition, stopCu, TENSION } from './fake-cu-run';
import { applyChange, recordOf, RunRecord } from './fake-runs';

export const CU_OMP_BUILD = '3f9a0c21b7e4';
export const CU_LIVE_RUN = 3;

const CU_CORE_BUILD = '5b6e2d81f0c4';
const MS_PER_SECOND = 1000;
const MINUTE_MS = 60 * MS_PER_SECOND;
const EQUILIBRATION_SECONDS = 31.2;
const RUN_ONE_SECONDS = 2;
const RUN_ONE_ENDED_AGO = 81 * MINUTE_MS;
const RUN_TWO_ENDED_AGO = 41 * MINUTE_MS;
const RUN_TWO_STOPPED: RunPosition = { section: TENSION, step: 96000 };

export const CU_OMP_CONFIG: RunConfig = configFor('local', ['MANYBODY', 'OPENMP']);

const CU_CORE_CONFIG: RunConfig = {
    ...configFor('local', []),
    accelerator: 'none',
    threadsPerRank: 1
};

const iso = (ms: number): string => new Date(ms).toISOString();

export const tensionSeconds = (step: number): number => EQUILIBRATION_SECONDS + step / TPS;

export const progressSeconds = ({ section, step }: RunProgress): number => (section === EQUILIBRATION ? step / TPS : tensionSeconds(step));

export const cuRun = (number: number, config: RunConfig, buildHash: string, startedAt: string): Run => ({
    simulationId: CU_SIMULATION_ID,
    number,
    state: 'starting',
    startedAt,
    endedAt: null,
    progress: plannedCuProgress(),
    error: null,
    config,
    buildHash,
    outputDir: `runs/run-${number}`,
    frames: 0,
    warnings: 0
});

export const replayedCuRun = (machines: Machine[], startedAt: number, target: RunPosition, at: number): RunRecord => {
    const record = recordOf(cuRun(CU_LIVE_RUN, CU_OMP_CONFIG, CU_OMP_BUILD, iso(startedAt)));
    replayCu(record, contextOf(machines, record.run), target, iso(at));

    return record;
};

const runOne = (machines: Machine[], now: number): RunRecord => {
    const endedAt = now - RUN_ONE_ENDED_AGO;
    const record = recordOf(cuRun(1, CU_CORE_CONFIG, CU_CORE_BUILD, iso(endedAt - RUN_ONE_SECONDS * MS_PER_SECOND)));
    applyChange(record, missingPackageCu(record, contextOf(machines, record.run), iso(endedAt)));

    return record;
};

const runTwo = (machines: Machine[], now: number): RunRecord => {
    const endedAt = now - RUN_TWO_ENDED_AGO;
    const record = recordOf(cuRun(2, CU_OMP_CONFIG, CU_OMP_BUILD, iso(endedAt - tensionSeconds(RUN_TWO_STOPPED.step) * MS_PER_SECOND)));
    const context = contextOf(machines, record.run);
    replayCu(record, context, RUN_TWO_STOPPED, iso(endedAt));
    applyChange(record, stopCu());
    applyChange(record, cancelCu(record.run, context, iso(endedAt)));

    return record;
};

export const pastCuRuns = (machines: Machine[], now: number): RunRecord[] => [runOne(machines, now), runTwo(machines, now)];

export const liveCuRun = (machines: Machine[], now: number, target: RunPosition): RunRecord =>
    replayedCuRun(machines, now - tensionSeconds(target.step) * MS_PER_SECOND, target, now);
