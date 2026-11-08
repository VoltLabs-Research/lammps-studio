export interface FileWatchHandlers{
    onAdd(filePath: string): void | Promise<void>;
    onChange(filePath: string): void | Promise<void>;
    onError(error: Error): void | Promise<void>;
}

export interface FileWatchHandle{
    close(): Promise<void>;
}

export interface FileWatcher{
    watch(rootPath: string, patterns: string[], handlers: FileWatchHandlers): Promise<FileWatchHandle>;
}
