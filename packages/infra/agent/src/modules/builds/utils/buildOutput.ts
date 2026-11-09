import { BuildErrors } from '@lammps-studio/runtime/domain/shared/errors';

const FAILED = BuildErrors.Failed().message;
const ABORTED = BuildErrors.Aborted().message;
const ABORTED_OUTPUT = 'Stopped before it finished';

const isBuildAborted = (message: string): boolean => message.startsWith(ABORTED);

export const buildOutputOf = (message: string): string => {
    if(isBuildAborted(message)) return ABORTED_OUTPUT;
    if(message.startsWith(`${FAILED}:`)) return message.slice(FAILED.length + 1);

    return message;
};
