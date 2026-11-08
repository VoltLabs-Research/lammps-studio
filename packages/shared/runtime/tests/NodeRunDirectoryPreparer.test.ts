import { lstat, mkdir, mkdtemp, readdir, readFile, readlink, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import NodeRunDirectoryPreparer from '../src/infrastructure/fs/NodeRunDirectoryPreparer';
import { Logger } from '../src/ports/Logger';

const silent: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    child: () => silent
};

const preparer = new NodeRunDirectoryPreparer(silent);
let simulation = '';

beforeEach(async () => {
    simulation = await mkdtemp(path.join(os.tmpdir(), 'lammps-runtime-sim-'));
    await writeFile(path.join(simulation, 'main.in'), 'pair_coeff * * potentials/Cu01.eam.alloy Cu\nrun 10\n');
    await writeFile(path.join(simulation, 'README.md'), 'notes');
    await mkdir(path.join(simulation, 'potentials'));
    await writeFile(path.join(simulation, 'potentials', 'Cu01.eam.alloy'), 'potential');
    await mkdir(path.join(simulation, '.studio'));
    await writeFile(path.join(simulation, '.studio', 'simulation.json'), '{}');
});

afterEach(async () => {
    await rm(simulation, { recursive: true, force: true });
});

describe('NodeRunDirectoryPreparer', () => {
    it('creates runs/run-1 with a snapshot of the entry script', async () => {
        const run = await preparer.prepare(simulation, 'main.in');

        expect(run).toEqual({ number: 1, dir: path.join(simulation, 'runs', 'run-1'), entry: 'main.in' });
        expect((await lstat(path.join(run.dir, 'main.in'))).isSymbolicLink()).toBe(false);
        expect(await readFile(path.join(run.dir, 'main.in'), 'utf8')).toContain('potentials/Cu01.eam.alloy');
    });

    it('keeps the snapshot when the entry script changes afterwards', async () => {
        const run = await preparer.prepare(simulation, 'main.in');
        await writeFile(path.join(simulation, 'main.in'), 'edited');

        expect(await readFile(path.join(run.dir, 'main.in'), 'utf8')).not.toBe('edited');
    });

    it('links every other top-level entry with a relative symlink so script paths resolve', async () => {
        const run = await preparer.prepare(simulation, 'main.in');

        expect((await readdir(run.dir)).sort()).toEqual(['README.md', 'main.in', 'potentials']);
        expect(await readlink(path.join(run.dir, 'potentials'))).toBe(path.join('..', '..', 'potentials'));
        expect(await readFile(path.join(run.dir, 'potentials', 'Cu01.eam.alloy'), 'utf8')).toBe('potential');
        expect(await realpath(path.join(run.dir, 'README.md'))).toBe(await realpath(path.join(simulation, 'README.md')));
    });

    it('numbers runs after the highest one already on disk', async () => {
        await mkdir(path.join(simulation, 'runs', 'run-7'), { recursive: true });
        await mkdir(path.join(simulation, 'runs', 'notes'), { recursive: true });

        const run = await preparer.prepare(simulation, 'main.in');

        expect(run.number).toBe(8);
    });

    it('gives concurrent runs distinct directories', async () => {
        const runs = await Promise.all([1, 2, 3].map(() => preparer.prepare(simulation, 'main.in')));

        expect(runs.map((run) => run.number).sort()).toEqual([1, 2, 3]);
    });

    it('copies an entry from a subfolder to the run directory and still links the subfolder', async () => {
        await mkdir(path.join(simulation, 'inputs'));
        await writeFile(path.join(simulation, 'inputs', 'tension.lammps'), 'run 5\n');

        const run = await preparer.prepare(simulation, 'inputs/tension.lammps');

        expect(run.entry).toBe('tension.lammps');
        expect(await readFile(path.join(run.dir, 'tension.lammps'), 'utf8')).toBe('run 5\n');
        expect((await lstat(path.join(run.dir, 'inputs'))).isSymbolicLink()).toBe(true);
    });

    it('fails when the entry script does not exist', async () => {
        await expect(preparer.prepare(simulation, 'missing.in')).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
