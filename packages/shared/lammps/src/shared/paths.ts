const SEPARATOR = '/';

export const normalizePath = (value: string): string => {
    const parts: string[] = [];

    for(const part of value.split(SEPARATOR)){
        if(part === '' || part === '.'){
            continue;
        }

        if(part === '..'){
            parts.pop();
            continue;
        }

        parts.push(part);
    }

    return parts.join(SEPARATOR);
};

export const baseName = (value: string): string => {
    return value.split(SEPARATOR).at(-1) ?? value;
};

export const depthOf = (value: string): number => {
    return normalizePath(value).split(SEPARATOR).length - 1;
};
