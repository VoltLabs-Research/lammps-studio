import type { RunExecution } from '../../domain/simulation/RunSpec';
import type { Accelerator } from '../../domain/shared/types';

const THREADED: Accelerator[] = ['omp', 'kokkos'];
const WHITESPACE = /\s+/;

export interface CommandInput{
    entry: string;
    execution: RunExecution;
    variables: Record<string, string>;
    allowRunAsRoot: boolean;
}

export interface LammpsCommand{
    argv: string[];
    env: Record<string, string>;
}

const acceleratorArgs = (execution: RunExecution): string[] => {
    const threads = String(execution.threadsPerRank);
    const args: Record<Accelerator, string[]> = {
        none: [],
        omp: ['-sf', 'omp', '-pk', 'omp', threads],
        kokkos: ['-k', 'on', 't', threads, '-sf', 'kk'],
        gpu: ['-sf', 'gpu', '-pk', 'gpu', String(Math.max(execution.gpus, 1))],
        intel: ['-sf', 'intel'],
        opt: ['-sf', 'opt']
    };

    return args[execution.accelerator];
};

const variableArgs = (variables: Record<string, string>): string[] => {
    return Object.entries(variables)
        .filter(([, value]) => value.trim().length > 0)
        .flatMap(([name, value]) => ['-var', name, ...value.trim().split(WHITESPACE)]);
};

const threadEnv = (execution: RunExecution): Record<string, string> => {
    if(!THREADED.includes(execution.accelerator)){
        return {};
    }

    return { OMP_NUM_THREADS: String(execution.threadsPerRank) };
};

export default class LammpsCommandBuilder{
    build(input: CommandInput): LammpsCommand{
        const { execution } = input;
        const mpirun = ['mpirun', ...(input.allowRunAsRoot ? ['--allow-run-as-root'] : []), '-np', String(execution.mpiRanks)];
        const lmp = ['lmp', '-in', input.entry, ...acceleratorArgs(execution), ...variableArgs(input.variables)];

        return {
            argv: [...mpirun, ...lmp],
            env: threadEnv(execution)
        };
    }
}
