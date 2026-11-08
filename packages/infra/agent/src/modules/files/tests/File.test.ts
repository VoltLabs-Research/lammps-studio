import { config } from '@/config';
import { FileEntry } from '@lammps-studio/contracts/file/domain';
import { fileRoutes } from '@lammps-studio/contracts/file/routes';
import { writeTree } from '@tests/files';
import { startAgent } from '@tests/harness';
import { expectError, request } from '@tests/request';
import { createSimulation, folderOf } from '@tests/simulations';
import { access, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DUMP_BYTES = Buffer.from('ITEM: TIMESTEP\n0\nITEM: NUMBER OF ATOMS\n2\n');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const app = await startAgent();

const simulation = await createSimulation(app, { name: 'Cu nanowire tension' });
await writeTree(folderOf(simulation), {
    'README.md': 'notes',
    'notes.txt': 'more notes',
    'potentials/Cu01.eam.alloy': 'eam',
    'runs/run-1/log.lammps': 'LAMMPS (22 Jul 2025)\n',
    'runs/run-1/wire.lammpstrj': DUMP_BYTES,
    'runs/run-1/restart.50000.cu': Buffer.from([0, 1, 2]),
    'runs/run-1/final.data': 'data',
    'runs/run-2/log.lammps': 'LAMMPS (22 Jul 2025)\n'
});
await writeTree(config.root, { 'secret.txt': 'outside' });
await symlink(join(config.root, 'secret.txt'), join(folderOf(simulation), 'escape.txt'));

const list = (path?: string) => request(app, fileRoutes.list, {
    params: { simulationId: simulation.id },
    query: path === undefined ? undefined : { path }
});

const download = (path: string) => request(app, fileRoutes.download, {
    params: { simulationId: simulation.id },
    query: { path }
});

const remove = (path: string) => request(app, fileRoutes.remove, {
    params: { simulationId: simulation.id },
    query: { path }
});

const summaryOf = (entries: FileEntry[]) => entries.map(({ name, directory, sizeBytes, items, kind }) => ({ name, directory, sizeBytes, items, kind }));

describe('FileController', () => {
    it('lists the simulation folder like Finder, folders first and dotfiles hidden', async () => {
        const res = await list();

        expect(res.status).toBe(200);
        expect(summaryOf(res.data())).toEqual([
            { name: 'potentials', directory: true, sizeBytes: null, items: 1, kind: 'Folder' },
            { name: 'runs', directory: true, sizeBytes: null, items: 2, kind: 'Folder' },
            { name: 'escape.txt', directory: false, sizeBytes: expect.any(Number), items: null, kind: 'Document' },
            { name: 'main.in', directory: false, sizeBytes: expect.any(Number), items: null, kind: 'LAMMPS input' },
            { name: 'notes.txt', directory: false, sizeBytes: 10, items: null, kind: 'Document' },
            { name: 'README.md', directory: false, sizeBytes: 5, items: null, kind: 'Markdown' }
        ]);
        expect(res.data().every((entry) => ISO_DATE.test(entry.modifiedAt))).toBe(true);
    });

    it('lists a subfolder with paths relative to the simulation', async () => {
        const res = await list('runs/run-1');

        expect(res.data().map(({ path, kind }) => ({ path, kind }))).toEqual([
            { path: 'runs/run-1/final.data', kind: 'Data file' },
            { path: 'runs/run-1/log.lammps', kind: 'LAMMPS log' },
            { path: 'runs/run-1/restart.50000.cu', kind: 'Restart, binary' },
            { path: 'runs/run-1/wire.lammpstrj', kind: 'Dump, text' }
        ]);
        expect((await list('potentials')).data()[0].kind).toBe('EAM potential');
    });

    it('downloads the raw bytes of a file', async () => {
        const res = await download('runs/run-1/wire.lammpstrj');

        expect(res.status).toBe(200);
        expect(res.contentType).toBe('application/octet-stream');
        expect(res.raw.equals(DUMP_BYTES)).toBe(true);
    });

    it('answers 404 for a folder to download or a path that does not exist', async () => {
        expectError(await download('runs'), 404, 'File::NotFound');
        expectError(await download('runs/run-9/log.lammps'), 404, 'File::NotFound');
        expectError(await list('main.in'), 404, 'File::NotFound');
    });

    it('rejects any path that leaves the simulation folder', async () => {
        expectError(await list('../'), 400, 'File::OutsideFolder');
        expectError(await list('runs/../../'), 400, 'File::OutsideFolder');
        expectError(await download('../../secret.txt'), 400, 'File::OutsideFolder');
        expectError(await download('/etc/hostname'), 400, 'File::OutsideFolder');
        expectError(await download('escape.txt'), 400, 'File::OutsideFolder');
        expectError(await remove('../cu-nanowire-tension'), 400, 'File::OutsideFolder');
        expectError(await remove(''), 400, 'File::OutsideFolder');
    });

    it('removes a file and a folder', async () => {
        expect((await remove('runs/run-1/final.data')).status).toBe(204);
        expect((await remove('runs/run-2')).status).toBe(204);

        await expect(access(join(folderOf(simulation), 'runs', 'run-1', 'final.data'))).rejects.toThrow();
        await expect(access(join(folderOf(simulation), 'runs', 'run-2'))).rejects.toThrow();
        expect((await list('runs')).data().map((entry) => entry.name)).toEqual(['run-1']);
        expectError(await remove('runs/run-2'), 404, 'File::NotFound');
    });
});
