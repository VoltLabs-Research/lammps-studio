import type { ContainerHandle } from './ContainerManagerPort';

export interface LogStreamHandlers{
    onStdout(line: string): void | Promise<void>;
    onStderr(line: string): void | Promise<void>;
    onError(error: Error): void | Promise<void>;
}

export interface LogStreamHandle{
    close(): Promise<void>;
}

export interface LogStreamerPort{
    stream(container: ContainerHandle, handlers: LogStreamHandlers): Promise<LogStreamHandle>;
}
