export type RunState = 'queued' | 'building' | 'starting' | 'running' | 'stopping' | 'cancelled' | 'completed' | 'failed';

export type Accelerator = 'none' | 'omp' | 'kokkos' | 'gpu' | 'intel' | 'opt';

export interface SlurmOptions{
    partition: string;
    nodes: number;
    time: string;
    account: string;
}

export interface RunConfig{
    machineId: string;
    version: string;
    packages: string[];
    accelerator: Accelerator;
    mpiRanks: number;
    threadsPerRank: number;
    gpus: number;
    slurm: SlurmOptions | null;
    entry: string;
    variables: Record<string, string>;
}

export interface RunError{
    message: string;
    step: number | null;
    line: number | null;
}

export interface RunProgress{
    step: number;
    totalSteps: number | null;
    section: number;
    sections: number;
    stepsPerSecond: number | null;
}

export interface RunSummary{
    number: number;
    state: RunState;
    startedAt: string;
    endedAt: string | null;
    progress: RunProgress;
    error: RunError | null;
}

export interface Run extends RunSummary{
    simulationId: string;
    config: RunConfig;
    buildHash: string;
    outputDir: string;
    frames: number;
    warnings: number;
}

export type LogLineKind = 'meta' | 'head' | 'thermo' | 'warning' | 'error' | 'text';

export interface LogLine{
    index: number;
    text: string;
    kind: LogLineKind;
}

export interface ThermoSection{
    section: number;
    columns: string[];
    rows: number[][];
}

export interface FrameInfo{
    index: number;
    step: number;
    atoms: number;
}
