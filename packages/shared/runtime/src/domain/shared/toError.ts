import LammpsRuntimeError from './LammpsRuntimeError';

export const toError = (cause: unknown): Error => {
    if(cause instanceof Error){
        return cause;
    }

    return new LammpsRuntimeError(`Runtime::Unknown:${String(cause)}`);
};

export const isDockerNotFound = (cause: unknown): boolean => {
    return typeof cause === 'object' && cause !== null && 'statusCode' in cause && cause.statusCode === 404;
};
