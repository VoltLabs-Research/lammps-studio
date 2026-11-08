import path from 'node:path';
import { watch } from 'chokidar';
import type { Logger } from '../../ports/Logger';
import type { FileWatchHandle, FileWatchHandlers, FileWatcher } from '../../ports/FileWatcher';
import { toError } from '../../domain/shared/toError';

const STABILITY_THRESHOLD_MS = 200;
const POLL_INTERVAL_MS = 50;

type ChokidarWatcher = ReturnType<typeof watch>;

const compilePattern = (pattern: string): RegExp => {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i');
};

const matches = (filePath: string, patterns: string[]): boolean => {
    if(patterns.length === 0){
        return true;
    }

    const fileName = path.basename(filePath);
    return patterns.some((pattern) => compilePattern(pattern).test(fileName));
};

export default class ChokidarFileWatcher implements FileWatcher{
    constructor(private readonly logger: Logger){}

    async watch(rootPath: string, patterns: string[], handlers: FileWatchHandlers): Promise<FileWatchHandle>{
        const watcher = watch(rootPath, {
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: STABILITY_THRESHOLD_MS,
                pollInterval: POLL_INTERVAL_MS
            }
        });

        this.bindFileEvent(watcher, 'add', patterns, handlers, handlers.onAdd);
        this.bindFileEvent(watcher, 'change', patterns, handlers, handlers.onChange);

        watcher.on('error', (error: unknown) => {
            this.logger.error('File watcher error.', { error: String(error) });
            void handlers.onError(toError(error));
        });

        return {
            close: async () => await watcher.close()
        };
    }

    private bindFileEvent(
        watcher: ChokidarWatcher,
        eventName: 'add' | 'change',
        patterns: string[],
        handlers: FileWatchHandlers,
        handle: (filePath: string) => void | Promise<void>
    ){
        watcher.on(eventName, (filePath: string) => {
            if(!matches(filePath, patterns)) return;

            void Promise.resolve(handle(filePath)).catch((error: unknown) => handlers.onError(toError(error)));
        });
    }
}
