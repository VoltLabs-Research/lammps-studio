export const optionalEnv = (key: string): string | undefined => {
    const value = process.env[key];
    return value === undefined || value === '' ? undefined : value;
};
