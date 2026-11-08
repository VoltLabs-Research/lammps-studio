import { BuildSpec } from '../build/BuildSpec';

export interface SimulationResources{
    cpus?: number;
    memory?: string;
    gpus?: 'all' | number;
}

export interface SimulationExecution{
    binary?: string;
    mpiRanks?: number;
    extraArgs?: string[];
    containerName?: string;
    workingDir?: string;
    shell?: string;
}

export interface DumpWatchSpec{
    enabled?: boolean;
    patterns?: string[];
    parseTimesteps?: boolean;
}

export interface CleanupPolicy{
    removeContainer?: boolean;
    removeWorkspace?: boolean;
}

export interface SimulationSpec{
    image: string | BuildSpec;
    inputFile: string;
    inputFiles?: string[];
    variables?: Record<string, string | number | boolean>;
    env?: Record<string, string>;
    labels?: Record<string, string>;
    resources?: SimulationResources;
    execution?: SimulationExecution;
    dumpWatch?: DumpWatchSpec;
    cleanup?: CleanupPolicy;
    outputDir: string;
}

export interface ResolvedExecution{
    binary: string;
    mpiRanks: number;
    extraArgs: string[];
    workingDir: string;
    shell: string;
    containerName?: string;
}

export interface ResolvedDumpWatch{
    enabled: boolean;
    patterns: string[];
    parseTimesteps: boolean;
}

export interface ResolvedCleanup{
    removeContainer: boolean;
    removeWorkspace: boolean;
}

export interface ResolvedSimulationSpec{
    image: string | BuildSpec;
    inputFile: string;
    inputFiles: string[];
    variables: Record<string, string | number | boolean>;
    env: Record<string, string>;
    labels: Record<string, string>;
    resources: SimulationResources;
    execution: ResolvedExecution;
    dumpWatch: ResolvedDumpWatch;
    cleanup: ResolvedCleanup;
    outputDir: string;
}
