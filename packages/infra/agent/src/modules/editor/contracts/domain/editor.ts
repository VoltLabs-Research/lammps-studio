import { ChildProcess } from 'node:child_process';

export interface EditorProcess{
    child: ChildProcess;
    ready: Promise<string>;
}

export type LineHandler = (line: string) => void;
