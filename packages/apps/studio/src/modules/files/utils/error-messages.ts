import type { FileErrorCode } from '@lammps-studio/contracts/file/errors';
import { errorCopy } from '@/shared/utils/error-copy';

export const fileErrorCopy = errorCopy<FileErrorCode>({
    'File::NotFound': 'This item is no longer in the folder.',
    'File::OutsideFolder': 'Studio only works with items inside the simulation folder.'
});
