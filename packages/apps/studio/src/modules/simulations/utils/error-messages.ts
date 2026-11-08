import { MachineErrorCode } from '@lammps-studio/contracts/machine/errors';
import { SimulationErrorCode } from '@lammps-studio/contracts/simulation/errors';
import { errorCopy } from '@/shared/utils/error-copy';

export const simulationErrorCopy = errorCopy<SimulationErrorCode | MachineErrorCode>({
    'Simulation::NameTaken': 'A simulation with this name already exists on this machine.',
    'Machine::Offline': 'This machine is offline. Pick another one or reconnect it from Settings.'
});
