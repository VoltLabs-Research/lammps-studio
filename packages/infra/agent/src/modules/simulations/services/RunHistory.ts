import typia from 'typia';
import { RUN_DIR, RUN_DIR_PREFIX, RUN_FILE, RUNS_DIR } from '../utils/layout';
import { isMissing } from '@/shared/utils/fsErrors';
import { RunSummary } from '@lammps-studio/contracts/run/domain';
import { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const runNumberOf = (entry: Dirent): number => Number(entry.name.slice(RUN_DIR_PREFIX.length));

export default class RunHistoryService{
    async last(folder: string): Promise<RunSummary | null>{
        const runs = join(folder, RUNS_DIR);

        let entries: Dirent[];
        try{
            entries = await readdir(runs, { withFileTypes: true });
        }catch(error: unknown){
            if(isMissing(error)) return null;
            throw error;
        }

        const newestFirst = entries
            .filter((entry) => entry.isDirectory() && RUN_DIR.test(entry.name))
            .sort((a, b) => runNumberOf(b) - runNumberOf(a));

        for(const entry of newestFirst){
            const summary = await this.#read(join(runs, entry.name, RUN_FILE));
            if(summary) return summary;
        }
        return null;
    }

    async #read(file: string): Promise<RunSummary | null>{
        let raw: string;
        try{
            raw = await readFile(file, 'utf8');
        }catch(error: unknown){
            if(isMissing(error)) return null;
            throw error;
        }

        return typia.misc.assertPrune<RunSummary>(JSON.parse(raw));
    }
}
