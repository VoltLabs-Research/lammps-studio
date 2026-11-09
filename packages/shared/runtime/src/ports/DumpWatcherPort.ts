import type { DumpFrame } from '../domain/dump/DumpFrame';

export interface DumpWatchHandlers{
    onFrame(frame: DumpFrame): void;
    onError(error: Error): void;
}

export interface DumpWatch{
    flush(): Promise<void>;
    close(): Promise<void>;
}

export interface DumpWatcherPort{
    watch(runDir: string, handlers: DumpWatchHandlers): Promise<DumpWatch>;
    scan(runDir: string): Promise<DumpFrame[]>;
    read(filePath: string, byteOffset: number): Promise<string>;
}
