import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { deleteSimulation } from '@/modules/simulations/utils/simulation-actions';
import { simulationErrorCopy } from '@/modules/simulations/utils/error-messages';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

interface DeleteSimulationDialogProps{
    simulation: Simulation;
    folder: string;
}

const DeleteSimulationDialog = ({ simulation, folder }: DeleteSimulationDialogProps) => (
    <ConfirmDialog
        title={`Delete ${simulation.name}?`}
        confirmLabel='Delete'
        onConfirm={() => deleteSimulation(simulation)}
        copy={simulationErrorCopy}
    >
        Studio deletes {folder} and every run in it.
    </ConfirmDialog>
);

export default DeleteSimulationDialog;
