import { config } from '@/config';
import { RunSummary } from '@lammps-studio/contracts/run/domain';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { writeTree } from '@tests/files';
import { startAgent } from '@tests/harness';
import { expectError, request } from '@tests/request';
import { createSimulation, folderOf } from '@tests/simulations';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const PREVIEW_BYTES = Buffer.from([0x52, 0x46, 0x53, 0x4c, 9, 9]);

const execFileAsync = promisify(execFile);

const app = await startAgent();

const scratch = (): Promise<string> => mkdtemp(join(config.root, 'source-'));

const summary = (number: number): RunSummary => ({
    number,
    state: 'completed',
    startedAt: '2026-11-08T10:00:00.000Z',
    endedAt: '2026-11-08T10:04:12.000Z',
    progress: {
        step: 250,
        totalSteps: 250,
        section: 1,
        sections: 1,
        stepsPerSecond: 812.5
    },
    error: null
});

const runFile = (number: number): string => JSON.stringify({
    ...summary(number),
    simulationId: 'ignored',
    buildHash: '3f9a0c21b7e4'
});

describe('a simulation folder', () => {
    it('creates a simulation from a local folder', async () => {
        const source = await scratch();
        await writeTree(source, {
            'water.lmp': 'include setup.lammps\nrun 1000\n',
            'setup.lammps': 'units real\n',
            'tip4p.data': 'data'
        });

        const simulation = await createSimulation(app, { name: 'Water box', template: 'folder', source });

        expect(simulation.entry).toBeNull();
        expect((await readdir(folderOf(simulation))).sort()).toEqual(['.studio', 'setup.lammps', 'tip4p.data', 'water.lmp']);
    });

    it('refuses a local folder that does not exist', async () => {
        const res = await request(app, simulationRoutes.create, {
            body: { name: 'Ghost', machineId: 'local', template: 'folder', source: join(config.root, 'no-such-folder') }
        });

        expect(res.json()).toEqual({ error: 'Request::ValidationFailed', errors: { source: 'Not a folder' } });
    });

    it('clones a git repository', async () => {
        const repository = await scratch();
        await writeTree(repository, { 'in.lj': 'run 10\n', 'main.in': 'run 20\n' });
        const git = (...args: string[]) => execFileAsync('git', ['-C', repository, '-c', 'user.name=Studio', '-c', 'user.email=studio@example.com', ...args]);
        await git('init', '--quiet');
        await git('add', '.');
        await git('commit', '--quiet', '-m', 'inputs');

        const simulation = await createSimulation(app, { name: 'Cloned', template: 'git', source: repository });

        expect(simulation.entry).toBe('main.in');
        expect(await readFile(join(folderOf(simulation), 'main.in'), 'utf8')).toBe('run 20\n');
    });

    it('reports a clone that fails and leaves no folder behind', async () => {
        const res = await request(app, simulationRoutes.create, {
            body: { name: 'Broken clone', machineId: 'local', template: 'git', source: join(config.root, 'no-such-repository') }
        });

        expectError(res, 422, 'Simulation::CloneFailed');
        expect(await readdir(config.simulationsDir)).not.toContain('broken-clone');
    });

    it('defaults the entry to main.in, then to the first .in file', async () => {
        const simulation = await createSimulation(app, { name: 'Defaults' });
        const entryOf = async () => (await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } })).data().entry;

        expect(await entryOf()).toBe('main.in');
        await rm(join(folderOf(simulation), 'main.in'));
        await writeTree(folderOf(simulation), { 'b.in': 'run 1\n', 'a.in': 'run 1\n', 'z.lmp': 'run 1\n' });
        expect(await entryOf()).toBe('a.in');
    });

    it('ranks the entry candidates like the picker, leaving out runs, hidden folders and LAMMPS output', async () => {
        const simulation = await createSimulation(app, { name: 'Candidates' });
        await writeTree(folderOf(simulation), {
            'water.lmp': 'units real\n\nminimize 1e-4 1e-6 100 1000\n',
            'setup.lammps': 'units real\nmass 1 1.0\n',
            'equil.in': 'variable t equal 300\n',
            'inputs/shear.in': 'run 500',
            'log.lammps': 'run 250\n',
            'runs/run-1/main.in': 'run 250\n',
            '.hidden/secret.in': 'run 1\n',
            'README.md': 'notes',
            'restart.100.cu': Buffer.from([0, 1, 2]),
            'blob.bin': Buffer.from([0x4c, 0, 0x53])
        });

        const res = await request(app, simulationRoutes.entryCandidates, { params: { simulationId: simulation.id } });

        expect(res.data()).toEqual([
            { path: 'main.in', lines: 23, hint: '23 lines · has a run command', likely: true },
            { path: 'equil.in', lines: 1, hint: '1 lines', likely: false },
            { path: 'inputs/shear.in', lines: 1, hint: '1 lines · has a run command', likely: false },
            { path: 'water.lmp', lines: 3, hint: '3 lines · has a run command', likely: false },
            { path: 'setup.lammps', lines: 2, hint: '2 lines', likely: false },
            { path: 'README.md', lines: 1, hint: 'text', likely: false }
        ]);
    });

    it('reads the last run from the highest numbered run folder', async () => {
        const simulation = await createSimulation(app, { name: 'Ran' });
        await writeTree(folderOf(simulation), {
            'runs/run-2/run.json': runFile(2),
            'runs/run-10/run.json': runFile(10),
            'runs/run-11/log.lammps': 'starting'
        });

        const res = await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } });

        expect(res.data().lastRun).toEqual(summary(10));
    });

    it('serves the preview as raw bytes once there is one', async () => {
        const simulation = await createSimulation(app, { name: 'Previewed' });
        const preview = () => request(app, simulationRoutes.preview, { params: { simulationId: simulation.id } });

        expectError(await preview(), 404, 'Simulation::NoPreview');
        await writeTree(folderOf(simulation), { '.studio/preview.bin': PREVIEW_BYTES });

        const res = await preview();
        expect(res.status).toBe(200);
        expect(res.contentType).toBe('application/octet-stream');
        expect(res.raw.equals(PREVIEW_BYTES)).toBe(true);
        const fetched = await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } });
        expect(fetched.data().hasPreview).toBe(true);
    });
});
