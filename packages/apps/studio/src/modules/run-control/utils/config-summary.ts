import { RunConfig, SlurmOptions } from '@lammps-studio/contracts/run/domain';
import { runResources } from '@/modules/runs/utils/run-rows';

const nodes = (slurm: SlurmOptions): string => `${slurm.nodes} node${slurm.nodes === 1 ? '' : 's'}`;

const resources = (config: RunConfig): string => {
    if(config.slurm) return `Slurm · ${config.slurm.partition} · ${nodes(config.slurm)}`;

    return runResources(config);
};

export const configSummary = (config: RunConfig): string => {
    if(config.packages.length === 0) return resources(config);

    return `${resources(config)} · ${config.packages.join(' ')}`;
};
