import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Accelerator, Run, RunConfig, SlurmOptions } from '@lammps-studio/contracts/run/domain';
import { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { LAMMPS_VERSIONS } from '@lammps-studio/lammps/catalog/versions';
import { orderedPackages, withAccelerator, withRequired } from '@/modules/run-settings/utils/draft-packages';
import { STEP_LIMITS } from '@/modules/run-settings/utils/step-limits';

export interface DraftSource{
    simulation: Simulation;
    machine: Machine | null;
    latestRun: Run | null;
    script: ScriptInfo | null;
}

interface ParallelDefaults{
    mpiRanks: number;
    threadsPerRank: number;
    accelerator: Accelerator;
}

export const DEFAULT_ENTRY = 'main.in';
const DEFAULT_THREADS = 2;
const DEFAULT_TIME_LIMIT = '04:00:00';
const PARTITION_LIST = ' · ';

const clamp = (value: number, [low, high]: readonly [number, number]): number => Math.min(high, Math.max(low, value));

export const partitionsOf = (machine: Machine): string[] => {
    const list = machine.scheduler?.split(PARTITION_LIST)[1];
    if(!list) return [];

    return list.split(',').map((name) => name.trim()).filter((name) => name !== '');
};

export const slurmDefaults = (machine: Machine): SlurmOptions => ({
    partition: partitionsOf(machine)[0] ?? '',
    nodes: STEP_LIMITS.nodes[0],
    time: DEFAULT_TIME_LIMIT,
    account: ''
});

const parallelDefaults = (machine: Machine | null): ParallelDefaults => {
    const cores = machine?.cores ?? 0;
    const threadsPerRank = cores >= DEFAULT_THREADS ? DEFAULT_THREADS : 1;

    return {
        mpiRanks: clamp(Math.floor(cores / threadsPerRank), STEP_LIMITS.mpiRanks),
        threadsPerRank,
        accelerator: threadsPerRank > 1 ? 'omp' : 'none'
    };
};

export const requiredNames = (script: ScriptInfo | null): string[] => [...new Set(script?.requiredPackages.map((pkg) => pkg.name) ?? [])];

export const initialDraft = ({ simulation, machine, latestRun, script }: DraftSource): RunConfig => {
    const entry = simulation.entry ?? script?.entry ?? DEFAULT_ENTRY;
    if(latestRun) return { ...latestRun.config, entry, packages: withRequired(latestRun.config.packages, requiredNames(script)) };

    const parallel = parallelDefaults(machine);

    return {
        machineId: simulation.machineId,
        version: LAMMPS_VERSIONS[0].ref,
        packages: orderedPackages(withAccelerator(requiredNames(script), parallel.accelerator)),
        accelerator: parallel.accelerator,
        mpiRanks: parallel.mpiRanks,
        threadsPerRank: parallel.threadsPerRank,
        gpus: 0,
        slurm: machine?.kind === 'slurm' ? slurmDefaults(machine) : null,
        entry,
        variables: {}
    };
};
