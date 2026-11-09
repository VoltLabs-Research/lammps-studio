import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Accelerator, RunConfig, SlurmOptions } from '@lammps-studio/contracts/run/domain';
import { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { requiredNames, slurmDefaults } from '@/modules/run-settings/utils/draft-defaults';
import { orderedPackages, toggledPackage, withAccelerator, withRequired } from '@/modules/run-settings/utils/draft-packages';
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

export const chooseAccelerator = (accelerator: Accelerator) => editDraft((config) => acceleratorPatch(config, accelerator));

export const toggleDraftPackage = (name: string) => editDraft((config) => ({ packages: toggledPackage(config.packages, name) }));

export const patchSlurm = (patch: Partial<SlurmOptions>) => editDraft((config) => (config.slurm ? { slurm: { ...config.slurm, ...patch } } : {}));

export const requireScriptPackages = (script: ScriptInfo | null) => {
    const { config } = useRunDraftStore.getState();
    if(!config) return;

    const packages = withRequired(config.packages, requiredNames(script));
    if(packages !== config.packages) patchDraft({ packages });
};
