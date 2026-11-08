import typia from 'typia';
import { FolderFill, SimulationRecord, StoredSimulation } from '../contracts/domain/simulation';
import { SimulationError } from '../contracts/domain/errors';
import { folderNameOf } from '../utils/folderName';
import { RECORD_FILE, STUDIO_DIR } from '../utils/layout';
import { config } from '@/config';
import { isMissing, isTaken } from '@/shared/utils/fsErrors';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const FIRST_SUFFIX = 2;

export default class SimulationStoreService{
    async list(): Promise<StoredSimulation[]>{
        const entries = await readdir(config.simulationsDir, { withFileTypes: true });
        const stored = await Promise.all(entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => this.#read(entry.name)));

        return stored
            .filter((simulation) => simulation !== null)
            .sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt));
    }

    async find(simulationId: string): Promise<StoredSimulation>{
        const simulation = (await this.list()).find((candidate) => candidate.record.id === simulationId);
        if(!simulation) throw SimulationError.NotFound();

        return simulation;
    }

    async create(record: SimulationRecord, fill: FolderFill): Promise<StoredSimulation>{
        const folder = await this.#reserve(folderNameOf(record.name));
        const path = join(config.simulationsDir, folder);

        try{
            await fill(path);
            await this.write(path, record);
        }catch(error: unknown){
            await rm(path, { recursive: true, force: true });
            throw error;
        }

        return {
            folder,
            path,
            record
        };
    }

    async write(path: string, record: SimulationRecord){
        await mkdir(join(path, STUDIO_DIR), { recursive: true });
        await writeFile(join(path, STUDIO_DIR, RECORD_FILE), `${JSON.stringify(record, null, 4)}\n`);
    }

    async #reserve(base: string): Promise<string>{
        let folder = base;
        for(let suffix = FIRST_SUFFIX; ; suffix += 1){
            try{
                await mkdir(join(config.simulationsDir, folder));
                return folder;
            }catch(error: unknown){
                if(!isTaken(error)) throw error;
            }
            folder = `${base}-${suffix}`;
        }
    }

    async #read(folder: string): Promise<StoredSimulation | null>{
        const path = join(config.simulationsDir, folder);

        let raw: string;
        try{
            raw = await readFile(join(path, STUDIO_DIR, RECORD_FILE), 'utf8');
        }catch(error: unknown){
            if(isMissing(error)) return null;
            throw error;
        }

        return {
            folder,
            path,
            record: typia.assert<SimulationRecord>(JSON.parse(raw))
        };
    }
}
