import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import type { Endpoint } from '@lammps-studio/contracts/shared/routing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openFolder, refreshFolder, selectEntry, useFolderStore } from '@/modules/files/store/folder';
import { call } from '@/shared/api/call';
import type { CallOptions } from '@/shared/contracts/api';
import { ClientError } from '@/shared/errors/ClientError';

vi.mock('@/shared/api/call', () => ({ call: vi.fn() }));

const listed = vi.mocked(call);

const entry = (path: string, directory: boolean): FileEntry => ({
    name: path.split('/').at(-1) ?? path,
    path,
    directory,
    sizeBytes: directory ? null : 10,
    items: directory ? 1 : null,
    modifiedAt: '2026-11-09T12:00:00.000Z',
    kind: directory ? 'Folder' : 'Document'
});

const FOLDERS: Record<string, FileEntry[]> = {
    '': [entry('main.in', false), entry('runs', true)],
    'runs': [entry('runs/run-2', true), entry('runs/run-1', true)]
};

const NOT_FOUND = new ClientError('File::NotFound', 404);

const queriedPath = (options: CallOptions<unknown> | undefined): string => {
    const query = options?.query;
    if(query && 'path' in query && typeof query.path === 'string') return query.path;

    throw new Error('listed without a path');
};

beforeEach(() => {
    listed.mockReset();
    listed.mockImplementation(async (_: Endpoint<unknown, unknown>, options?: CallOptions<unknown>) => {
        const entries = FOLDERS[queriedPath(options)];
        if(!entries) throw NOT_FOUND;

        return entries;
    });
});

describe('the folder store', () => {
    it('lists a folder in Finder order', async () => {
        await openFolder('cu', '');

        expect(useFolderStore.getState().entries.map((item) => item.name)).toEqual(['runs', 'main.in']);
        expect(useFolderStore.getState().status).toBe('ready');
    });

    it('walks up to the nearest folder that still exists', async () => {
        await openFolder('cu', 'runs/run-3');
        await vi.waitFor(() => expect(useFolderStore.getState().status).toBe('ready'));

        expect(useFolderStore.getState().path).toBe('runs');
        expect(useFolderStore.getState().entries.map((item) => item.name)).toEqual(['run-1', 'run-2']);
    });

    it('fails at the root instead of walking past it', async () => {
        listed.mockRejectedValue(NOT_FOUND);
        await openFolder('cu', '');

        expect(useFolderStore.getState().status).toBe('failed');
    });

    it('drops the selection when it changes folder and keeps it on refresh', async () => {
        await openFolder('cu', '');
        selectEntry('main.in');
        await refreshFolder();
        expect(useFolderStore.getState().selected).toBe('main.in');

        await openFolder('cu', 'runs');
        expect(useFolderStore.getState().selected).toBeNull();
    });

    it('ignores a listing that arrives after the user moved on', async () => {
        let release: (entries: FileEntry[]) => void = () => undefined;
        listed.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
        const slow = openFolder('cu', '');
        await openFolder('cu', 'runs');
        release(FOLDERS['']);
        await slow;

        expect(useFolderStore.getState().path).toBe('runs');
        expect(useFolderStore.getState().entries.map((item) => item.name)).toEqual(['run-1', 'run-2']);
    });
});
