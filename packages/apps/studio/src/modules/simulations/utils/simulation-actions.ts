import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { simulationApi } from '@/modules/simulations/api/api';
import { simulationErrorCopy } from '@/modules/simulations/utils/error-messages';
import { copyText } from '@/shared/services/clipboard';
import { useSimulationsStore } from '@/shared/store/simulations';
import { toast } from '@/shared/store/toast';

export const folderOf = (simulation: Simulation, machine: Machine | undefined): string => {
    if(!machine) return simulation.folder;

    return `${machine.root}/${simulation.folder}`;
};

export const duplicateSimulation = (simulation: Simulation) =>
    simulationApi.duplicate(simulation.id).then((copy) => {
        useSimulationsStore.getState().upsert(copy);
        toast(`Duplicated ${simulation.name}`);
    }, (error: unknown) => toast(simulationErrorCopy(error)));

export const showFolder = (path: string) => copyText(path, path);

export const deleteSimulation = async (simulation: Simulation) => {
    await simulationApi.remove(simulation.id);
    useSimulationsStore.getState().remove(simulation.id);
};
