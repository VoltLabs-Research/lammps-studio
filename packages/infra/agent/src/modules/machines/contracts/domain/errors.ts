import { MachineErrors } from '@lammps-studio/contracts/machine/errors';
import { defineErrors } from '@lammps-studio/readable/utils/errors/define-errors';

export const MachineError = defineErrors(MachineErrors);
