import { RunConfig, SlurmOptions } from '@lammps-studio/contracts/run/domain';

const nodes = (slurm: SlurmOptions): string => `${slurm.nodes} node${slurm.nodes === 1 ? '' : 's'}`;

export const parallelSummary = (config: RunConfig): string => `${config.mpiRanks} MPI × ${config.threadsPerRank} OpenMP`;

const resources = (config: RunConfig): string => {
    if(config.slurm) return `Slurm · ${config.slurm.partition} · ${nodes(config.slurm)}`;

    return parallelSummary(config);
};

export const configSummary = (config: RunConfig): string => {
    if(config.packages.length === 0) return resources(config);

    return `${resources(config)} · ${config.packages.join(' ')}`;
};
