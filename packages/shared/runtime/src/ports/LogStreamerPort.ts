import type { ContainerHandle } from './ContainerManagerPort';

export interface LogStreamHandlers{
    onStdout(line: string): void;
    onStderr(line: string): void;
    onError(error: Error): void;
}

export interface LogStreamHandle{
    ended: Promise<void>;
    close(): Promise<void>;
}

export interface LogStreamerPort{
    stream(container: ContainerHandle, handlers: LogStreamHandlers): Promise<LogStreamHandle>;
}
