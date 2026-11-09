import { Run, RunConfig, RunState } from '@lammps-studio/contracts/run/domain';

export const LAMMPS_VERSION = 'stable_22Jul2025_update1';

export const runConfig = (patch: Partial<RunConfig> = {}): RunConfig => ({
    machineId: 'local',
    version: LAMMPS_VERSION,
    packages: ['MANYBODY'],
    accelerator: 'none',
    mpiRanks: 2,
    threadsPerRank: 1,
    gpus: 0,
    slurm: null,
    entry: 'main.in',
    variables: {},
    ...patch
});

export const runRecord = (simulationId: string, number: number, buildHash: string, state: RunState = 'completed'): Run => ({
    simulationId,
    number,
    state,
    startedAt: '2026-11-08T10:00:00.000Z',
    endedAt: null,
    progress: {
        step: 0,
        totalSteps: null,
        section: 1,
        sections: 1,
        stepsPerSecond: null
    },
    error: null,
    config: runConfig(),
    buildHash,
    outputDir: `runs/run-${number}`,
    frames: 0,
    warnings: 0
});
