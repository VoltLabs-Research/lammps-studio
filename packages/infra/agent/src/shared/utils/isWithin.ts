import { isAbsolute, relative, sep } from 'node:path';

const PARENT = '..';

export const isWithin = (root: string, target: string): boolean => {
    const path = relative(root, target);
    if(isAbsolute(path)) return false;

    return path !== PARENT && !path.startsWith(`${PARENT}${sep}`);
};
