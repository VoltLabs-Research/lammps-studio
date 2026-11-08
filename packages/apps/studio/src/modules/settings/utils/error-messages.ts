import { BuildErrorCode } from '@lammps-studio/contracts/build/errors';
import { MachineErrorCode } from '@lammps-studio/contracts/machine/errors';
import { errorCopy } from '@/shared/utils/error-copy';

export const buildErrorCopy = errorCopy<BuildErrorCode | MachineErrorCode>({
    'Build::Failed': 'LAMMPS didn’t build. The build log on the machine has the details.',
    'Machine::Offline': 'This machine is offline. Reconnect it before building.'
});
