import { RUNS_DIR } from '../utils/layout';
import { isLammpsOutput } from '@lammps-studio/lammps/files/file-kind';
import { ScriptFile } from '@lammps-studio/lammps/script/domain';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const HIDDEN = '.';
const MAX_SCRIPT_BYTES = 1024 * 1024;
const NUL = 0;
const POSIX_SEPARATOR = '/';

const isBinary = (bytes: Buffer): boolean => bytes.includes(NUL);

export default class ScriptFilesService{
    async read(folder: string): Promise<ScriptFile[]>{
        const paths = await this.#candidates(folder, folder);
        const files = await Promise.all(paths.map((path) => this.#readText(folder, path)));

        return files.filter((file) => file !== null);
    }

    async #candidates(folder: string, dir: string): Promise<string[]>{
        const paths: string[] = [];
        for(const entry of await readdir(dir, { withFileTypes: true })){
            const path = join(dir, entry.name);
            if(entry.name.startsWith(HIDDEN) || path === join(folder, RUNS_DIR)) continue;

            if(entry.isDirectory()){
                paths.push(...await this.#candidates(folder, path));
            }else if(entry.isFile() && !isLammpsOutput(entry.name)){
                paths.push(path);
            }
        }
        return paths;
    }

    async #readText(folder: string, path: string): Promise<ScriptFile | null>{
        if((await stat(path)).size > MAX_SCRIPT_BYTES) return null;

        const bytes = await readFile(path);
        if(isBinary(bytes)) return null;

        return {
            path: relative(folder, path).split(sep).join(POSIX_SEPARATOR),
            text: bytes.toString('utf8')
        };
    }
}
