import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import type { Machine } from '@lammps-studio/contracts/machine/domain';
import type { Run } from '@lammps-studio/contracts/run/domain';
import { describe, expect, it } from 'vitest';
import { finderKeyAction } from '@/modules/files/utils/finder-keys';
import { crumbsOf, entrySize, fileTarget, finderFoot, finderOrder, formatFileSize, fullPath, parentOf, runOwning } from '@/modules/files/utils/finder';

const file = (path: string, kind: string, sizeBytes = 1000): FileEntry => ({
    name: path.split('/').at(-1) ?? path,
    path,
    directory: false,
    sizeBytes,
    items: null,
    modifiedAt: '2026-11-09T12:00:00.000Z',
    kind
});

const folder = (path: string, items: number): FileEntry => ({
    name: path.split('/').at(-1) ?? path,
    path,
    directory: true,
    sizeBytes: null,
    items,
    modifiedAt: '2026-11-09T12:00:00.000Z',
    kind: 'Folder'
});

const run = (number: number): Run => ({
    simulationId: 'cu',
    number,
    state: 'completed',
    startedAt: '2026-11-09T11:00:00.000Z',
    endedAt: '2026-11-09T11:13:00.000Z',
    progress: { step: 500000, totalSteps: 500000, section: 2, sections: 2, stepsPerSecond: null },
    error: null,
    config: {
        machineId: 'local',
        version: 'stable',
        packages: [],
        accelerator: 'omp',
        mpiRanks: 8,
        threadsPerRank: 2,
        gpus: 0,
        slurm: null,
        entry: 'main.in',
        variables: {}
    },
    buildHash: '3f9a0c21b7e4',
    outputDir: `runs/run-${number}`,
    frames: 0,
    warnings: 0
});

const RUNS = [run(1), run(2), run(10)];

const MACHINE: Machine = {
    id: 'local',
    name: 'This computer',
    kind: 'local',
    status: 'online',
    host: 'rody-workstation',
    os: 'Ubuntu 24.04',
    cpu: 'Ryzen 9 7950X',
    cores: 16,
    memory: '64 GB',
    gpus: 0,
    runtime: 'Docker 27.3',
    scheduler: null,
    agentVersion: '0.1.0',
    root: '~/lammps-studio/simulations',
    diskFree: '412 GB',
    offlineSince: null
};

describe('the Finder order', () => {
    it('puts folders first, then sorts names naturally and without case', () => {
        const entries = [file('restart.100000.cu', 'Restart, binary'), file('README.md', 'Markdown'), folder('runs', 3), file('main.in', 'LAMMPS input'), file('restart.50000.cu', 'Restart, binary'), folder('potentials', 1)];

        expect(finderOrder(entries).map((entry) => entry.name)).toEqual(['potentials', 'runs', 'main.in', 'README.md', 'restart.50000.cu', 'restart.100000.cu']);
    });

    it('orders run folders by number, not by text', () => {
        const entries = [folder('runs/run-10', 1), folder('runs/run-2', 1), folder('runs/run-1', 1)];

        expect(finderOrder(entries).map((entry) => entry.name)).toEqual(['run-1', 'run-2', 'run-10']);
    });
});

describe('the Finder paths', () => {
    it('steps up one folder, to the root from the top', () => {
        expect(parentOf('runs/run-3')).toBe('runs');
        expect(parentOf('runs')).toBe('');
    });

    it('builds a crumb for the simulation folder and each folder below it', () => {
        expect(crumbsOf('cu-nanowire-tension', 'runs/run-3')).toEqual([
            { label: 'cu-nanowire-tension', path: '' },
            { label: 'runs', path: 'runs' },
            { label: 'run-3', path: 'runs/run-3' }
        ]);
        expect(crumbsOf('water-box', '')).toEqual([{ label: 'water-box', path: '' }]);
    });

    it('joins an entry onto the machine folder for Copy path', () => {
        expect(fullPath('~/lammps-studio/simulations/cu', 'runs/run-3/log.lammps')).toBe('~/lammps-studio/simulations/cu/runs/run-3/log.lammps');
        expect(fullPath('~/lammps-studio/simulations/cu', '')).toBe('~/lammps-studio/simulations/cu');
    });

    it('finds the run whose folder holds an entry, not one with a longer number', () => {
        expect(runOwning('runs/run-1/log.lammps', RUNS)?.number).toBe(1);
        expect(runOwning('runs/run-10/log.lammps', RUNS)?.number).toBe(10);
        expect(runOwning('main.in', RUNS)).toBeNull();
    });
});

describe('the Finder columns', () => {
    it('sizes files with one decimal and folders by item count', () => {
        expect(formatFileSize(0)).toBe('0 B');
        expect(formatFileSize(612)).toBe('0.6 KB');
        expect(formatFileSize(23_100)).toBe('23.1 KB');
        expect(formatFileSize(1_700_000)).toBe('1.7 MB');
        expect(formatFileSize(2_400_000_000)).toBe('2.4 GB');
        expect(entrySize(folder('runs', 3))).toBe('3 items');
        expect(entrySize(folder('potentials', 1))).toBe('1 item');
    });

    it('counts the items and the space left on the machine in the footer', () => {
        expect(finderFoot(5, MACHINE)).toBe('5 items · 412 GB available on This computer');
        expect(finderFoot(1, undefined)).toBe('1 item');
    });
});

describe('what opening an entry does', () => {
    it('enters folders, shows run logs in Output and run dumps in the viewport', () => {
        expect(fileTarget(folder('runs', 3), RUNS)).toBe('folder');
        expect(fileTarget(file('runs/run-2/log.lammps', 'LAMMPS log'), RUNS)).toBe('output');
        expect(fileTarget(file('runs/run-2/wire.lammpstrj', 'Dump, text'), RUNS)).toBe('viewport');
    });

    it('downloads binaries and dumps outside a run, and edits the rest', () => {
        expect(fileTarget(file('runs/run-2/restart.50000.cu', 'Restart, binary'), RUNS)).toBe('download');
        expect(fileTarget(file('old/wire.lammpstrj', 'Dump, text'), RUNS)).toBe('download');
        expect(fileTarget(file('main.in', 'LAMMPS input'), RUNS)).toBe('editor');
        expect(fileTarget(file('log.lammps', 'LAMMPS log'), RUNS)).toBe('editor');
    });
});

describe('the Finder keys', () => {
    const entries = [folder('potentials', 1), folder('runs', 3), file('main.in', 'LAMMPS input')];
    const key = (name: string, command = false) => ({ key: name, command });

    it('moves the selection and stops at the ends', () => {
        expect(finderKeyAction(key('ArrowDown'), entries, 'potentials')).toEqual({ kind: 'select', path: 'runs' });
        expect(finderKeyAction(key('ArrowDown'), entries, 'main.in')).toEqual({ kind: 'select', path: 'main.in' });
        expect(finderKeyAction(key('ArrowUp'), entries, 'potentials')).toEqual({ kind: 'select', path: 'potentials' });
        expect(finderKeyAction(key('End'), entries, 'potentials')).toEqual({ kind: 'select', path: 'main.in' });
        expect(finderKeyAction(key('Home'), entries, 'main.in')).toEqual({ kind: 'select', path: 'potentials' });
    });

    it('starts from the first row going down and the last going up', () => {
        expect(finderKeyAction(key('ArrowDown'), entries, null)).toEqual({ kind: 'select', path: 'potentials' });
        expect(finderKeyAction(key('ArrowUp'), entries, null)).toEqual({ kind: 'select', path: 'main.in' });
    });

    it('opens with Enter or Command-Down and goes up with Command-Up', () => {
        expect(finderKeyAction(key('Enter'), entries, 'runs')).toEqual({ kind: 'open' });
        expect(finderKeyAction(key('ArrowDown', true), entries, 'runs')).toEqual({ kind: 'open' });
        expect(finderKeyAction(key('Enter'), entries, null)).toBeNull();
        expect(finderKeyAction(key('ArrowUp', true), [], null)).toEqual({ kind: 'parent' });
    });

    it('ignores other keys', () => {
        expect(finderKeyAction(key('a'), entries, 'runs')).toBeNull();
    });
});
