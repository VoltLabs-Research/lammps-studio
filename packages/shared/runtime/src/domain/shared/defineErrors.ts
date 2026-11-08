import LammpsRuntimeError from './LammpsRuntimeError';

export type ErrorFactory = (detail?: string) => LammpsRuntimeError;

export const defineErrors = <const Cause extends string>(domain: string, causes: readonly Cause[]): Record<Cause, ErrorFactory> => {
    const entries = causes.map((cause): [Cause, ErrorFactory] => [cause, (detail?: string) => {
        const code = detail === undefined ? `${domain}::${cause}` : `${domain}::${cause}:${detail}`;
        return new LammpsRuntimeError(code);
    }]);

    return Object.fromEntries(entries) as Record<Cause, ErrorFactory>;
};
