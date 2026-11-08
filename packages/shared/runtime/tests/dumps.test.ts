import { appendFile, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DumpFrameScanner, { sniffDumpFormat } from '../src/domain/dump/DumpFrameScanner';
import { DumpFrame } from '../src/domain/dump/DumpFrame';
import ChokidarDumpWatcher from '../src/infrastructure/fs/ChokidarDumpWatcher';
import DumpFileTracker from '../src/infrastructure/fs/DumpFileTracker';
import { Logger } from '../src/ports/Logger';

const fixture = async (name: string): Promise<Buffer> => await readFile(new URL(`./fixtures/${name}`, import.meta.url));

const silent: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    child: () => silent
};

const frameStarts = (text: string, marker: string): number[] => {
    const starts: number[] = [];
    for(let at = text.indexOf(marker); at >= 0; at = text.indexOf(marker, at + 1)){
        starts.push(at);
    }

    return starts;
};

describe('DumpFrameScanner', () => {
    it.each([
        ['custom.lammpstrj', 'lammps' as const, [0, 20, 40, 60], 'ITEM: TIMESTEP'],
        ['positions.xyz', 'xyz' as const, [0, 30, 60], '108\n Atoms']
    ])('finds every complete frame of %s with its step and byte offset', async (name, format, steps, marker) => {
        const bytes = await fixture(name);
        const frames = new DumpFrameScanner(format, 0).push(bytes);

        expect(frames.map((frame) => frame.step)).toEqual(steps);
        expect(frames.map((frame) => frame.index)).toEqual(steps.map((_, index) => index));
        expect(frames.map((frame) => frame.byteOffset)).toEqual(frameStarts(bytes.toString('utf8'), marker));
        expect(frames.reduce((total, frame) => total + frame.byteLength, 0)).toBe(bytes.length);
    });

    it('reports a frame only once its last atom line is complete, however the bytes arrive', async () => {
        const bytes = await fixture('custom.lammpstrj');
        const scanner = new DumpFrameScanner('lammps', 0);
        const steps: number[] = [];
        const CHUNK = 97;

        for(let start = 0; start < bytes.length; start += CHUNK){
            const seen = scanner.push(bytes.subarray(start, start + CHUNK));
            seen.forEach((frame) => {
                expect(frame.byteOffset + frame.byteLength).toBeLessThanOrEqual(start + CHUNK);
                steps.push(frame.step);
            });
        }

        expect(steps).toEqual([0, 20, 40, 60]);
    });

    it('holds back the last frame while its atoms are still being written', async () => {
        const text = (await fixture('custom.lammpstrj')).toString('utf8');
        const cut = text.lastIndexOf('\n', text.length - 2) - 10;

        expect(new DumpFrameScanner('lammps', 0).push(Buffer.from(text.slice(0, cut))).map((frame) => frame.step)).toEqual([0, 20, 40]);
    });

    it('steps over UNITS and TIME items', async () => {
        const frames = new DumpFrameScanner('lammps', 0).push(await fixture('units-time.lammpstrj'));

        expect(frames.map((frame) => frame.step)).toEqual([0, 5, 10]);
        expect(frames[0].byteOffset).toBe(0);
    });

    it.each([
        ['ITEM: TIMESTEP\n0\n', 'dump.atom', 'lammps'],
        ['108\n Atoms. Timestep: 0\n', 'traj.xyz', 'xyz'],
        ['LAMMPS (22 Jul 2025 - Update 1)\n', 'log.lammps', 'not-dump'],
        ['108\n Atoms. Timestep: 0\n', 'counts.txt', 'not-dump'],
        ['ITE', 'traj.lammpstrj', 'undecided']
    ])('sniffs %j in %s as %s', (head, name, format) => {
        expect(sniffDumpFormat(Buffer.from(head), name)).toBe(format);
    });
});

describe('dump watching', () => {
    let dir = '';

    beforeEach(async () => {
        dir = await mkdtemp(path.join(os.tmpdir(), 'lammps-runtime-dumps-'));
    });

    afterEach(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it('emits each frame once as a dump grows, and ignores logs and symlinked files', async () => {
        const bytes = await fixture('custom.lammpstrj');
        const half = bytes.indexOf('ITEM: TIMESTEP\n40\n');
        const frames: DumpFrame[] = [];
        const tracker = new DumpFileTracker({ onFrame: (frame) => frames.push(frame), onError: (error) => { throw error; } });
        const dump = path.join(dir, 'wire.lammpstrj');
        const linked = path.join(dir, 'previous.lammpstrj');

        await writeFile(path.join(dir, 'log.lammps'), 'LAMMPS (22 Jul 2025 - Update 1)\n');
        await writeFile(path.join(dir, '..', `${path.basename(dir)}-source.lammpstrj`), bytes);
        await symlink(path.join(dir, '..', `${path.basename(dir)}-source.lammpstrj`), linked);
        await writeFile(dump, bytes.subarray(0, half));

        await Promise.all([tracker.update(dump), tracker.update(path.join(dir, 'log.lammps')), tracker.update(linked)]);
        await appendFile(dump, bytes.subarray(half));
        await tracker.update(dump);
        await tracker.update(dump);

        expect(frames).toEqual([0, 20, 40, 60].map((step, index) => ({
            path: dump,
            step,
            index,
            byteOffset: frameStarts(bytes.toString('utf8'), 'ITEM: TIMESTEP')[index]
        })));
        await rm(path.join(dir, '..', `${path.basename(dir)}-source.lammpstrj`));
    });

    it('reads frame N back by its byte offset', async () => {
        const bytes = await fixture('custom.lammpstrj');
        const dump = path.join(dir, 'wire.lammpstrj');
        await writeFile(dump, bytes);
        const offsets = frameStarts(bytes.toString('utf8'), 'ITEM: TIMESTEP');

        const text = await new ChokidarDumpWatcher(silent).read(dump, offsets[2]);

        expect(text).toBe(bytes.toString('utf8', offsets[2], offsets[3]));
    });

    it('picks up dumps written after the watch starts and flushes the rest before the run ends', async () => {
        const bytes = await fixture('positions.xyz');
        const frames: DumpFrame[] = [];
        const watcher = new ChokidarDumpWatcher(silent);
        const watch = await watcher.watch(dir, { onFrame: (frame) => frames.push(frame), onError: (error) => { throw error; } });

        await writeFile(path.join(dir, 'traj.xyz'), bytes);
        await vi.waitFor(() => expect(frames).toHaveLength(3));
        await watch.flush();
        await watch.close();

        expect(frames.map((frame) => frame.step)).toEqual([0, 30, 60]);
    });
});
