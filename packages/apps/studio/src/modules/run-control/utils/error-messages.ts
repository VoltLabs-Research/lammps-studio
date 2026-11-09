import { MachineErrorCode } from '@lammps-studio/contracts/machine/errors';
import { RunErrorCode } from '@lammps-studio/contracts/run/errors';
import { SimulationErrorCode } from '@lammps-studio/contracts/simulation/errors';
import { errorCopy } from '@/shared/utils/error-copy';

export const runErrorCopy = errorCopy<RunErrorCode | SimulationErrorCode | MachineErrorCode>({
    'Run::AlreadyRunning': 'This simulation is already running.',
    'Run::NotRunning': 'This run has already stopped.',
    'Run::NotFound': 'This run no longer exists.',
    'Run::FrameNotFound': 'This frame is no longer on disk.',
    'Simulation::NoEntryScript': 'Choose the entry script first.',
    'Simulation::EntryOutsideFolder': 'The entry script has to be inside the simulation folder.',
    'Machine::Offline': 'This machine is offline. Pick another one in Build and run.'
});
