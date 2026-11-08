import ValidationError from '@lammps-studio/readable/errors/Validation';
import { SimulationError } from '../contracts/domain/errors';
import { config } from '@/config';
import { statIfExists } from '@/shared/utils/fsErrors';
import { CreateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { logger } from '@lammps-studio/readable/utils/Logger';
import { execFile } from 'node:child_process';
import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const EMPTY_TEMPLATE = 'empty';
const EXAMPLES_DIR = 'examples';
const EXAMPLES = ['melt', 'crack', 'indent'];

const execFileAsync = promisify(execFile);

export default class SimulationTemplateService{
    async fill(path: string, input: CreateSimulationInput){
        switch(input.template){
            case 'empty':
                return this.#copyAsset(path, EMPTY_TEMPLATE);
            case 'example':
                return this.#copyExample(path, this.#source(input));
            case 'folder':
                return this.#copyFolder(path, this.#source(input));
            case 'git':
                return this.#clone(path, this.#source(input));
        }
    }

    #source(input: CreateSimulationInput): string{
        const source = input.source?.trim() ?? '';
        if(source === '') throw new ValidationError({ source: 'Required' });

        return source;
    }

    async #copyAsset(path: string, asset: string){
        await cp(join(config.assetsDir, asset), path, { recursive: true });
    }

    async #copyExample(path: string, example: string){
        if(!EXAMPLES.includes(example)) throw new ValidationError({ source: 'Unknown example' });

        await this.#copyAsset(path, join(EXAMPLES_DIR, example));
    }

    async #copyFolder(path: string, source: string){
        if((await statIfExists(source))?.isDirectory() !== true) throw new ValidationError({ source: 'Not a folder' });

        await cp(source, path, { recursive: true });
    }

    async #clone(path: string, url: string){
        try{
            await execFileAsync('git', ['clone', '--', url, path], {
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
            });
        }catch(error: unknown){
            logger.warn('git clone failed', { scope: 'simulations', url, error: String(error) });
            throw SimulationError.CloneFailed();
        }
    }
}
