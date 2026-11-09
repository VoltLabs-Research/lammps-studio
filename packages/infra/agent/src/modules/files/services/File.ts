import SimulationStoreService from '@/modules/simulations/services/SimulationStore';
import { FileError } from '../contracts/domain/errors';
import { LocatedPath } from '../contracts/domain/file';
import { isMissing } from '@/shared/utils/fsErrors';
import { isWithin } from '@/shared/utils/isWithin';
import { FileEntry } from '@lammps-studio/contracts/file/domain';
import { FOLDER, fileKindOf } from '@lammps-studio/lammps/files/file-kind';
import { createReadStream } from 'node:fs';
import { lstat, readdir, realpath, rm } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { Readable } from 'node:stream';

const HIDDEN = '.';

const isVisible = (name: string): boolean => !name.startsWith(HIDDEN);

const byFinderOrder = (a: FileEntry, b: FileEntry): number => {
    return Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
};

export default class FileService{
    #simulations = new SimulationStoreService();

    async list(simulationId: string, path = ''): Promise<FileEntry[]>{
        const located = await this.#locate(simulationId, path);
        const dir = await this.#follow(located);
        if(!(await lstat(dir)).isDirectory()) throw FileError.NotFound();

        const names = (await readdir(dir)).filter(isVisible);
        const entries = await Promise.all(names.map((name) => this.#describe(located.root, join(dir, name))));
        return entries.sort(byFinderOrder);
    }

    async download(simulationId: string, path = ''): Promise<Readable>{
        const file = await this.#follow(await this.#locate(simulationId, path));
        if(!(await lstat(file)).isFile()) throw FileError.NotFound();

        return createReadStream(file);
    }

    async remove(simulationId: string, path = ''){
        const { root, target } = await this.#locate(simulationId, path);
        if(target === root) throw FileError.OutsideFolder();

        try{
            await rm(target, { recursive: true });
        }catch(error: unknown){
            if(isMissing(error)) throw FileError.NotFound();
            throw error;
        }
    }

    async #locate(simulationId: string, path: string): Promise<LocatedPath>{
        const simulation = await this.#simulations.find(simulationId);
        const root = await realpath(simulation.path);
        const target = resolve(root, path);
        if(!isWithin(root, target)) throw FileError.OutsideFolder();

        return {
            root,
            target
        };
    }

    async #follow({ root, target }: LocatedPath): Promise<string>{
        let real: string;
        try{
            real = await realpath(target);
        }catch(error: unknown){
            if(isMissing(error)) throw FileError.NotFound();
            throw error;
        }

        if(!isWithin(root, real)) throw FileError.OutsideFolder();
        return real;
    }

    async #describe(root: string, path: string): Promise<FileEntry>{
        const stats = await lstat(path);
        const directory = stats.isDirectory();
        const name = basename(path);

        return {
            name,
            path: relative(root, path),
            directory,
            sizeBytes: directory ? null : stats.size,
            items: directory ? (await readdir(path)).filter(isVisible).length : null,
            modifiedAt: stats.mtime.toISOString(),
            kind: directory ? FOLDER : fileKindOf(name)
        };
    }
}
