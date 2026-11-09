import { rename, writeFile } from 'node:fs/promises';

const TEMP_SUFFIX = '.tmp';

export const writeFileAtomic = async (path: string, data: string | Uint8Array) => {
    const temp = `${path}${TEMP_SUFFIX}`;

    await writeFile(temp, data);
    await rename(temp, path);
};
