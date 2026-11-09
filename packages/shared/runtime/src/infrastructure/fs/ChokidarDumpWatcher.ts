import { open, readdir } from 'node:fs/promises';
import path from 'node:path';
import { watch } from 'chokidar';
import { DumpFrame } from '../../domain/dump/DumpFrame';
import DumpFrameScanner, { DumpFormat, sniffDumpFormat } from '../../domain/dump/DumpFrameScanner';
import { DumpErrors } from '../../domain/shared/errors';
import { toError } from '../../domain/shared/toError';
import type { DumpWatch, DumpWatcherPort, DumpWatchHandlers } from '../../ports/DumpWatcherPort';
import type { Logger } from '../../ports/Logger';
import DumpFileTracker from './DumpFileTracker';

const READ_CHUNK_BYTES = 4 * 1024 * 1024;
const SNIFF_BYTES = 64;

const byName = (a: string, b: string): number => a.localeCompare(b, 'en', { numeric: true });

const readAt = async (filePath: string, position: number, length: number): Promise<Buffer> => {
    const handle = await open(filePath, 'r');
    try{
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await handle.read(buffer, 0, length, position);
        return buffer.subarray(0, bytesRead);
    }finally{
        await handle.close();
    }
};

export default class ChokidarDumpWatcher implements DumpWatcherPort{
    constructor(private readonly logger: Logger){}

    async watch(runDir: string, handlers: DumpWatchHandlers): Promise<DumpWatch>{
        const tracker = new DumpFileTracker(handlers);
        const watcher = watch(runDir, { depth: 0, followSymlinks: false, ignoreInitial: false });
        const onFile = (filePath: string) => void tracker.update(filePath);

        watcher.on('add', onFile);
        watcher.on('change', onFile);
        watcher.on('error', (error: unknown) => {
            this.logger.error(`Dump watcher error in ${runDir}`, { error: String(error) });
            handlers.onError(toError(error));
        });

        await new Promise<void>((resolve) => watcher.once('ready', resolve));

        return {
            flush: async () => {
                const entries = await readdir(runDir, { withFileTypes: true });
                await Promise.all(entries.filter((entry) => entry.isFile()).map((entry) => tracker.update(path.join(runDir, entry.name))));
                await tracker.settle();
            },
            close: async () => {
                await watcher.close();
                await tracker.settle();
            }
        };
    }

    async scan(runDir: string): Promise<DumpFrame[]>{
        const names = (await readdir(runDir, { withFileTypes: true }))
            .filter((entry) => entry.isFile())
            .map((entry) => entry.name)
            .sort(byName);

        const frames: DumpFrame[] = [];
        for(const name of names){
            frames.push(...await this.#scanFile(path.join(runDir, name)));
        }

        return frames;
    }

    async read(filePath: string, byteOffset: number): Promise<string>{
        const format = await this.#formatAt(filePath, byteOffset);
        if(format === null){
            throw DumpErrors.NotDump(`${filePath}@${byteOffset}`);
        }

        const scanner = new DumpFrameScanner(format, byteOffset);
        const chunks: Buffer[] = [];

        for(let position = byteOffset; ; position += READ_CHUNK_BYTES){
            const chunk = await readAt(filePath, position, READ_CHUNK_BYTES);
            if(chunk.length === 0){
                throw DumpErrors.NoFrame(`${filePath}@${byteOffset}`);
            }

            chunks.push(chunk);
            const [frame] = scanner.push(chunk);
            if(frame){
                return Buffer.concat(chunks).toString('utf8', 0, frame.byteLength);
            }
        }
    }

    async #formatAt(filePath: string, byteOffset: number): Promise<DumpFormat | null>{
        const format = sniffDumpFormat(await readAt(filePath, byteOffset, SNIFF_BYTES), path.basename(filePath));
        if(format !== 'lammps' && format !== 'xyz'){
            return null;
        }

        return format;
    }

    async #scanFile(filePath: string): Promise<DumpFrame[]>{
        const format = await this.#formatAt(filePath, 0);
        if(format === null){
            return [];
        }

        const scanner = new DumpFrameScanner(format, 0);
        const frames: DumpFrame[] = [];
        for(let position = 0; ; position += READ_CHUNK_BYTES){
            const chunk = await readAt(filePath, position, READ_CHUNK_BYTES);
            if(chunk.length === 0){
                return frames;
            }

            for(const frame of scanner.push(chunk)){
                frames.push({ path: filePath, step: frame.step, index: frame.index, atoms: frame.atoms, byteOffset: frame.byteOffset });
            }
        }
    }
}
