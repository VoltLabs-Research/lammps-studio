import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import type { Machine } from '@lammps-studio/contracts/machine/domain';
import type { Run } from '@lammps-studio/contracts/run/domain';
import type { Crumb, FileTarget } from '@/modules/files/domain/files';
import { formatInt } from '@/shared/utils/format';

const SEPARATOR = '/';
const KILOBYTE = 1e3;
const MEGABYTE = 1e6;
const GIGABYTE = 1e9;
const LOG_KIND = 'LAMMPS log';
const DUMP_KIND = 'Dump, text';
const DOWNLOAD_KINDS = ['Restart, binary', DUMP_KIND];

const byName = (a: FileEntry, b: FileEntry): number => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });

export const finderOrder = (entries: FileEntry[]): FileEntry[] => [...entries].sort((a, b) => Number(b.directory) - Number(a.directory) || byName(a, b));

export const parentOf = (path: string): string => path.split(SEPARATOR).slice(0, -1).join(SEPARATOR);

export const crumbsOf = (rootName: string, path: string): Crumb[] => {
    const segments = path === '' ? [] : path.split(SEPARATOR);
    const crumbs = segments.map((label, index) => ({ label, path: segments.slice(0, index + 1).join(SEPARATOR) }));

    return [{ label: rootName, path: '' }, ...crumbs];
};

export const fullPath = (folder: string, path: string): string => {
    if(path === '') return folder;

    return `${folder}${SEPARATOR}${path}`;
};

export const itemsLabel = (count: number): string => `${formatInt(count)} item${count === 1 ? '' : 's'}`;

export const finderFoot = (count: number, machine: Machine | undefined): string => {
    if(!machine) return itemsLabel(count);

    return `${itemsLabel(count)} · ${machine.diskFree} available on ${machine.name}`;
};

export const formatFileSize = (bytes: number): string => {
    if(bytes === 0) return '0 B';
    if(bytes >= GIGABYTE) return `${(bytes / GIGABYTE).toFixed(1)} GB`;
    if(bytes >= MEGABYTE) return `${(bytes / MEGABYTE).toFixed(1)} MB`;

    return `${(bytes / KILOBYTE).toFixed(1)} KB`;
};

export const entrySize = (entry: FileEntry): string => {
    if(entry.directory) return itemsLabel(entry.items ?? 0);

    return formatFileSize(entry.sizeBytes ?? 0);
};

export const runOwning = (path: string, runs: Run[]): Run | null => runs.find((run) => path.startsWith(`${run.outputDir}${SEPARATOR}`)) ?? null;

export const fileTarget = (entry: FileEntry, runs: Run[]): FileTarget => {
    if(entry.directory) return 'folder';

    const inRun = runOwning(entry.path, runs) !== null;
    if(inRun && entry.kind === LOG_KIND) return 'output';
    if(inRun && entry.kind === DUMP_KIND) return 'viewport';
    if(DOWNLOAD_KINDS.includes(entry.kind)) return 'download';

    return 'editor';
};
