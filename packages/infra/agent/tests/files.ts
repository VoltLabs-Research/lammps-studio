import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type FileTree = Record<string, string | Buffer>;

export const writeTree = async (root: string, tree: FileTree) => {
    for(const [path, content] of Object.entries(tree)){
        await mkdir(dirname(join(root, path)), { recursive: true });
        await writeFile(join(root, path), content);
    }
};
