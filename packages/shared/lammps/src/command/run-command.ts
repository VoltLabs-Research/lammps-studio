import type { RunConfig, SlurmOptions } from '@lammps-studio/contracts/run/domain';
import { acceleratorArgs, usesThreads } from '../catalog/accelerators';

const PENDING_BUILD = 'new';

const lmpArgs = (config: RunConfig): string => {
    const accelerator = acceleratorArgs(config.accelerator, config.threadsPerRank, config.gpus);
    const variables = Object.entries(config.variables)
        .filter(([, value]) => value !== '')
        .flatMap(([name, value]) => ['-var', name, value]);

    return ['lmp', '-in', config.entry, ...accelerator, ...variables].join(' ');
};

const slurmCommand = (config: RunConfig, slurm: SlurmOptions, buildHash: string | null): string => {
    const job = `sbatch -p ${slurm.partition} -N ${slurm.nodes} -t ${slurm.time} -A ${slurm.account}`;
    const image = `lammps-${buildHash ?? PENDING_BUILD}.sif`;

    return `${job}\n  srun apptainer exec ${image} \\\n  ${lmpArgs(config)}`;
};

export const runCommand = (config: RunConfig, buildHash: string | null): string => {
    if(config.slurm){
        return slurmCommand(config, config.slurm, buildHash);
    }

    const env = usesThreads(config.accelerator) ? `OMP_NUM_THREADS=${config.threadsPerRank} ` : '';
    return `${env}mpirun -np ${config.mpiRanks} ${lmpArgs(config)}`;
};
