import { SimulationError } from '../contracts/domain/errors';
import { RUNS_DIR } from '../utils/layout';
import { statIfExists } from '@/shared/utils/fsErrors';
import { LAMMPS_INPUT, fileKindOf } from '@/shared/utils/fileKind';
import { isWithin } from '@/shared/utils/isWithin';
import { EntryCandidate } from '@lammps-studio/contracts/script/domain';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const PRIMARY_ENTRY = 'main.in';
const PRIMARY_EXTENSION = '.in';
const RUN_COMMAND = /^\s*(run|minimize)\s+\S/m;
const HIDDEN = '.';

const rankOf = (path: string): number => {
    if(path === PRIMARY_ENTRY) return 0;
    if(extname(path) === PRIMARY_EXTENSION) return 1;

    return 2;
};

const byEntryRank = (a: string, b: string): number => {
    return rankOf(a) - rankOf(b) || a.localeCompare(b, 'en', { numeric: true });
};

const lineCount = (text: string): number => {
    if(text === '') return 0;

    return text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
};

export default class EntryScriptService{
    async defaultEntry(folder: string): Promise<string | null>{
        const scripts = (await readdir(folder, { withFileTypes: true }))
            .filter((entry) => entry.isFile() && extname(entry.name) === PRIMARY_EXTENSION)
            .map((entry) => entry.name)
            .sort(byEntryRank);

        return scripts[0] ?? null;
    }

    async candidates(folder: string): Promise<EntryCandidate[]>{
        const scripts = (await this.#scripts(folder, folder)).sort(byEntryRank);

        return Promise.all(scripts.map((path) => this.#describe(folder, path)));
    }

    async validate(folder: string, entry: string): Promise<string>{
        const target = resolve(folder, entry);
        if(!isWithin(folder, target)) throw SimulationError.EntryOutsideFolder();
        if((await statIfExists(target))?.isFile() !== true) throw SimulationError.NoEntryScript();

        return relative(folder, target);
    }

    async #scripts(folder: string, dir: string): Promise<string[]>{
        const scripts: string[] = [];
        for(const entry of await readdir(dir, { withFileTypes: true })){
            const path = join(dir, entry.name);
            if(entry.name.startsWith(HIDDEN) || path === join(folder, RUNS_DIR)) continue;

            if(entry.isDirectory()){
                scripts.push(...await this.#scripts(folder, path));
            }else if(entry.isFile() && fileKindOf(entry.name) === LAMMPS_INPUT){
                scripts.push(relative(folder, path));
            }
        }
        return scripts;
    }

    async #describe(folder: string, path: string): Promise<EntryCandidate>{
        const text = await readFile(join(folder, path), 'utf8');
        const command = RUN_COMMAND.exec(text)?.[1];

        return {
            path,
            lines: lineCount(text),
            hint: command === undefined ? '' : `has a ${command} command`,
            likely: command !== undefined
        };
    }
}
