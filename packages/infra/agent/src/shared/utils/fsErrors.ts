import { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';

const MISSING = ['ENOENT', 'ENOTDIR'];
const TAKEN = 'EEXIST';

const codeOf = (error: unknown): unknown => {
    if(!(error instanceof Error) || !('code' in error)) return undefined;

    return error.code;
};

export const isMissing = (error: unknown): boolean => MISSING.includes(String(codeOf(error)));

export const isTaken = (error: unknown): boolean => codeOf(error) === TAKEN;

export const statIfExists = async (path: string): Promise<Stats | null> => {
    try{
        return await stat(path);
    }catch(error: unknown){
        if(isMissing(error)) return null;
        throw error;
    }
};
