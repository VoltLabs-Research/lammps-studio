import type { Accelerator } from '../shared/types';

export const CONTAINER_SIMULATION_DIR = '/simulation';
export const SIMULATION_LABEL = 'lammps-studio.simulation';
export const RUN_LABEL = 'lammps-studio.run';

export interface RunExecution{
    mpiRanks: number;
    threadsPerRank: number;
    gpus: number;
    accelerator: Accelerator;
}

export interface PreparedRun{
    number: number;
    dir: string;
    entry: string;
}

export interface RunSpec{
    image: string;
    simulationId: string;
    simulationDir: string;
    run: PreparedRun;
    execution: RunExecution;
    variables: Record<string, string>;
}

export const runIdOf = (simulationId: string, runNumber: number): string => {
    return `${simulationId}/run-${runNumber}`;
};
