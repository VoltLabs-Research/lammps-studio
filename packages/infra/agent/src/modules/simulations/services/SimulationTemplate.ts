import ValidationError from '@lammps-studio/readable/errors/Validation';
import { SimulationError } from '../contracts/domain/errors';
import { crackScript } from '../templates/crackScript';
import { emptyScript } from '../templates/emptyScript';
import { indentScript } from '../templates/indentScript';
import { meltScript } from '../templates/meltScript';
import { statIfExists } from '@/shared/utils/fsErrors';
import { CreateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { logger } from '@lammps-studio/readable/utils/Logger';
import { execFile } from 'node:child_process';
import { cp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const ENTRY_SCRIPT = 'main.in';
const EXAMPLES = new Map([
    ['melt', meltScript],
    ['crack', crackScript],
    ['indent', indentScript]
]);

const execFileAsync = promisify(execFile);

export default class SimulationTemplateService{
    async fill(path: string, input: CreateSimulationInput){
        switch(input.template){
            case 'empty':
                return this.#writeEntry(path, emptyScript);
            case 'example':
                return this.#writeExample(path, this.#source(input));
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

    async #writeEntry(path: string, script: string){
        await writeFile(join(path, ENTRY_SCRIPT), script);
    }

    async #writeExample(path: string, example: string){
        const script = EXAMPLES.get(example);
        if(script === undefined) throw new ValidationError({ source: 'Unknown example' });

        await this.#writeEntry(path, script);
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
