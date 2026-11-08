import LammpsRuntimeError from './LammpsRuntimeError';

export const toError = (cause: unknown): Error => {
    if(cause instanceof Error){
        return cause;
    }

    return new LammpsRuntimeError(`Runtime::Unknown:${String(cause)}`);
};

const NOT_FOUND = 404;
const CONFLICT = 409;
const REMOVAL_IN_PROGRESS = /removal of container .* is already in progress/;

const statusOf = (cause: unknown): number | null => {
    if(typeof cause !== 'object' || cause === null || !('statusCode' in cause) || typeof cause.statusCode !== 'number'){
        return null;
    }

    return cause.statusCode;
};

export const isDockerNotFound = (cause: unknown): boolean => {
    return statusOf(cause) === NOT_FOUND;
};

export const isDockerGone = (cause: unknown): boolean => {
    if(isDockerNotFound(cause)){
        return true;
    }

    return statusOf(cause) === CONFLICT && cause instanceof Error && REMOVAL_IN_PROGRESS.test(cause.message);
};
