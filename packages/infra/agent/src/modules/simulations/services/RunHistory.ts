import typia from 'typia';
import { RUN_DIR, RUN_DIR_PREFIX, RUN_FILE, RUNS_DIR, runDirOf } from '../utils/layout';
import { isMissing } from '@/shared/utils/fsErrors';
import { Run, RunSummary } from '@lammps-studio/contracts/run/domain';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const runNumberOf = (name: string): number => Number(name.slice(RUN_DIR_PREFIX.length));

const readRunFile = async (folder: string, runNumber: number): Promise<string | null> => {
    try{
        return await readFile(join(runDirOf(folder, runNumber), RUN_FILE), 'utf8');
    }catch(error: unknown){
        if(isMissing(error)) return null;
        throw error;
    }
};

export default class RunHistoryService{
    async list(folder: string): Promise<Run[]>{
        const numbers = await this.#numbers(folder);
        const runs = await Promise.all(numbers.map((number) => this.find(folder, number)));

        return runs.filter((run) => run !== null);
    }

    async find(folder: string, runNumber: number): Promise<Run | null>{
        const raw = await readRunFile(folder, runNumber);
        if(raw === null) return null;

        return typia.assert<Run>(JSON.parse(raw));
    }

    async last(folder: string): Promise<RunSummary | null>{
        for(const number of (await this.#numbers(folder)).reverse()){
            const raw = await readRunFile(folder, number);
            if(raw !== null) return typia.misc.assertPrune<RunSummary>(JSON.parse(raw));
        }
        return null;
    }

    async #numbers(folder: string): Promise<number[]>{
        let names: string[];
        try{
            names = await readdir(join(folder, RUNS_DIR));
        }catch(error: unknown){
            if(isMissing(error)) return [];
            throw error;
        }

        return names
            .filter((name) => RUN_DIR.test(name))
            .map(runNumberOf)
            .sort((a, b) => a - b);
    }
}
