export const isMissing = (error: unknown): boolean => {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
};
