import ScriptFilesService from './ScriptFiles';
import { SimulationError } from '../contracts/domain/errors';
import { statIfExists } from '@/shared/utils/fsErrors';
import { isWithin } from '@/shared/utils/isWithin';
import { EntryCandidate } from '@lammps-studio/contracts/script/domain';
import { defaultEntry, resolveEntry } from '@lammps-studio/lammps/script/resolve-entry';
import { relative, resolve } from 'node:path';

export default class EntryScriptService{
    #scripts = new ScriptFilesService();

    async defaultEntry(folder: string): Promise<string | null>{
        return defaultEntry(await this.#scripts.read(folder));
    }

    async candidates(folder: string): Promise<EntryCandidate[]>{
        return resolveEntry(await this.#scripts.read(folder));
    }

    async validate(folder: string, entry: string): Promise<string>{
        const target = resolve(folder, entry);
        if(!isWithin(folder, target)) throw SimulationError.EntryOutsideFolder();
        if((await statIfExists(target))?.isFile() !== true) throw SimulationError.NoEntryScript();

        return relative(folder, target);
    }
}
