import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Accelerator, RunConfig } from '@lammps-studio/contracts/run/domain';
import { slurmDefaults } from '@/modules/run-settings/utils/draft-defaults';
import { orderedPackages, withAccelerator } from '@/modules/run-settings/utils/draft-packages';
import { useRunDraftStore } from '@/shared/store/run-draft';

export const machinePatch = (config: RunConfig, machine: Machine): Partial<RunConfig> => ({
    machineId: machine.id,
    gpus: Math.min(config.gpus, machine.gpus),
    slurm: machine.kind === 'slurm' ? config.slurm ?? slurmDefaults(machine) : null
});

export const acceleratorPatch = (config: RunConfig, accelerator: Accelerator): Partial<RunConfig> => ({
    accelerator,
    packages: orderedPackages(withAccelerator(config.packages, accelerator))
});

export const patchDraft = (patch: Partial<RunConfig>) => useRunDraftStore.getState().patchDraft(patch);

export const editDraft = (edit: (config: RunConfig) => Partial<RunConfig>) => {
    const { config } = useRunDraftStore.getState();
    if(config) patchDraft(edit(config));
};

export const chooseMachine = (machine: Machine) => editDraft((config) => machinePatch(config, machine));
