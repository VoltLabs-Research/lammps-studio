import { join, posix } from 'node:path';

export const STUDIO_DIR = '.studio';
export const RECORD_FILE = 'simulation.json';
export const PREVIEW_FILE = 'preview.bin';
export const RUNS_DIR = 'runs';
export const RUN_FILE = 'run.json';
export const SCREEN_FILE = 'screen.log';
export const RUN_DIR_PREFIX = 'run-';
export const RUN_DIR = /^run-\d+$/;

export const outputDirOf = (runNumber: number): string => posix.join(RUNS_DIR, `${RUN_DIR_PREFIX}${runNumber}`);

export const runDirOf = (folder: string, runNumber: number): string => join(folder, outputDirOf(runNumber));
