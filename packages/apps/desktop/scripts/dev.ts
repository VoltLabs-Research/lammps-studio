import { ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { DEV_STUDIO_URL } from '../src/studio.ts';

const STUDIO_POLL_MS = 100;

const desktopDir = join(import.meta.dirname, '..');
const studioDir = join(desktopDir, '..', 'studio');
const children = new Set<ChildProcess>();
let stopping = false;

const stopAll = (code: number) => {
    stopping = true;
    process.exitCode ??= code;
    for(const child of children) child.kill();
};

const runNode = (cwd: string, script: string, args: string[]) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, stdio: 'inherit' });
    children.add(child);
    child.on('exit', (code) => stopAll(code ?? 1));
};

const isServing = async (): Promise<boolean> => {
    const response = await fetch(DEV_STUDIO_URL).catch(() => undefined);
    return response?.ok === true;
};

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

runNode(studioDir, join(studioDir, 'node_modules', 'vite', 'bin', 'vite.js'), []);
while(!stopping && !await isServing()) await sleep(STUDIO_POLL_MS);
if(!stopping) runNode(desktopDir, join(desktopDir, 'node_modules', 'electron', 'cli.js'), ['.', ...process.argv.slice(2)]);
