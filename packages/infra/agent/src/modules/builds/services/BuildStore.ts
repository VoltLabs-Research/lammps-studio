import typia from 'typia';
import { BuildRecord } from '../contracts/domain/build';
import { config } from '@/config';
import { isMissing } from '@/shared/utils/fsErrors';
import { writeFileAtomic } from '@/shared/utils/writeFileAtomic';
import { readFile } from 'node:fs/promises';

export default class BuildStoreService{
    async read(): Promise<BuildRecord[]>{
        let raw: string;
        try{
            raw = await readFile(config.buildsFile, 'utf8');
        }catch(error: unknown){
            if(isMissing(error)) return [];
            throw error;
        }

        return typia.assert<BuildRecord[]>(JSON.parse(raw));
    }

    async write(records: BuildRecord[]){
        await writeFileAtomic(config.buildsFile, `${JSON.stringify(records, null, 4)}\n`);
    }
}
