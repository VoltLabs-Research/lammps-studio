import { lstat, open } from 'node:fs/promises';
import path from 'node:path';
import DumpFrameScanner, { sniffDumpFormat } from '../../domain/dump/DumpFrameScanner';
import { DumpWatchHandlers } from '../../ports/DumpWatcherPort';
import { toError } from '../../domain/shared/toError';

interface TrackedFile{
    scanner: DumpFrameScanner | null;
    offset: number;
    ignored: boolean;
    queue: Promise<void>;
}

const readAppended = async (filePath: string, offset: number): Promise<Buffer> => {
    const handle = await open(filePath, 'r');
    try{
        const { size } = await handle.stat();
        if(size <= offset){
            return Buffer.alloc(0);
        }

        const buffer = Buffer.alloc(size - offset);
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
        return buffer.subarray(0, bytesRead);
    }finally{
        await handle.close();
    }
};

const untracked = (): TrackedFile => ({
    scanner: null,
    offset: 0,
    ignored: false,
    queue: Promise.resolve()
});

export default class DumpFileTracker{
    readonly #files = new Map<string, TrackedFile>();

    constructor(private readonly handlers: DumpWatchHandlers){}

    update(filePath: string){
        const tracked = this.#files.get(filePath) ?? untracked();
        this.#files.set(filePath, tracked);
        tracked.queue = this.#after(tracked.queue, filePath, tracked);

        return tracked.queue;
    }

    async settle(){
        await Promise.all([...this.#files.values()].map((tracked) => tracked.queue));
    }

    async #after(previous: Promise<void>, filePath: string, tracked: TrackedFile){
        await previous;
        if(tracked.ignored){
            return;
        }

        try{
            await this.#read(filePath, tracked);
        }catch(error){
            tracked.ignored = true;
            this.handlers.onError(toError(error));
        }
    }

    async #read(filePath: string, tracked: TrackedFile){
        if(tracked.scanner === null && (await lstat(filePath)).isSymbolicLink()){
            tracked.ignored = true;
            return;
        }

        const chunk = await readAppended(filePath, tracked.offset);
        if(chunk.length === 0){
            return;
        }

        const scanner = tracked.scanner ?? this.#detect(filePath, chunk, tracked);
        if(scanner === null){
            return;
        }

        tracked.offset += chunk.length;
        for(const frame of scanner.push(chunk)){
            this.handlers.onFrame({ path: filePath, step: frame.step, index: frame.index, atoms: frame.atoms, byteOffset: frame.byteOffset });
        }
    }

    #detect(filePath: string, head: Buffer, tracked: TrackedFile): DumpFrameScanner | null{
        const format = sniffDumpFormat(head, path.basename(filePath));
        if(format === 'not-dump'){
            tracked.ignored = true;
        }

        if(format !== 'lammps' && format !== 'xyz'){
            return null;
        }

        tracked.scanner = new DumpFrameScanner(format, 0);
        return tracked.scanner;
    }
}
