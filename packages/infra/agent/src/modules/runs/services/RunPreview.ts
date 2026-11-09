import { RunFrame } from '../contracts/domain/run';
import { statIfExists } from '@/shared/utils/fsErrors';
import { writeFileAtomic } from '@/shared/utils/writeFileAtomic';
import { decimateFrame } from '@lammps-studio/lammps/dump/decimate-frame';
import { encodeFrame } from '@lammps-studio/lammps/dump/frame-codec';
import { parseDumpFrame } from '@lammps-studio/lammps/dump/parse-dump';
import { logger } from '@lammps-studio/readable/utils/Logger';
import LammpsRuntime from '@lammps-studio/runtime/public/LammpsRuntime';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const PREVIEW_EVERY_MS = 2000;
const PREVIEW_ATOMS = 10_000;

export type PreviewCreated = () => void;

export default class RunPreview{
    #pending: RunFrame | null = null;
    #timer: NodeJS.Timeout | null = null;
    #writtenAt = 0;
    #writing = Promise.resolve();

    constructor(
        private readonly runtime: LammpsRuntime,
        private readonly path: string,
        private readonly created: PreviewCreated
    ){}

    offer(frame: RunFrame){
        this.#pending = frame;
        if(this.#timer !== null) return;

        const wait = Math.max(0, this.#writtenAt + PREVIEW_EVERY_MS - Date.now());
        this.#timer = setTimeout(() => this.#write(), wait);
    }

    async drain(){
        this.stop();
        this.#write();
        await this.#writing;
    }

    stop(){
        if(this.#timer !== null) clearTimeout(this.#timer);
        this.#timer = null;
    }

    #write(){
        this.#timer = null;
        const frame = this.#pending;
        if(frame === null) return;

        this.#pending = null;
        this.#writtenAt = Date.now();
        this.#writing = this.#writing.then(() => this.#render(frame)).catch((error: unknown) => {
            logger.warn('Could not write the simulation preview', { scope: 'runs', path: this.path, error: String(error) });
        });
    }

    async #render(frame: RunFrame){
        const text = await this.runtime.readFrame(frame.path, frame.byteOffset);
        const bytes = encodeFrame(decimateFrame(parseDumpFrame(text), PREVIEW_ATOMS));
        const existed = await statIfExists(this.path);

        await mkdir(dirname(this.path), { recursive: true });
        await writeFileAtomic(this.path, new Uint8Array(bytes));
        if(existed === null) this.created();
    }
}
