import { describe, expect, it } from 'vitest';
import { StatusItem } from '@/modules/run-control/domain/run-control';
import { buildFixture, configFixture, machineFixture, runFixture } from '@/modules/run-control/tests/fixtures';
import { configSummary } from '@/modules/run-control/utils/config-summary';
import { StatusbarContext, statusbarOf, versionText } from '@/modules/run-control/utils/statusbar-items';

const config = configFixture();
const build = buildFixture();

const context = (patch: Partial<StatusbarContext> = {}): StatusbarContext => ({
    phase: 'idle',
    run: null,
    machine: machineFixture(),
    config,
    build,
    entry: 'main.in',
    ...patch
});

const texts = (items: StatusItem[]): string[] => items.map((item) => item.text);

describe('configSummary', () => {
    it('describes a local run by its ranks, threads and packages', () => {
        expect(configSummary(config)).toBe('8 MPI × 2 OpenMP · MANYBODY OPENMP');
    });

    it('describes a Slurm job by its partition and nodes', () => {
        const slurm = { partition: 'cpu', nodes: 4, time: '12:00:00', account: 'mat-sci' };

        expect(configSummary(configFixture({ slurm }))).toBe('Slurm · cpu · 4 nodes · MANYBODY OPENMP');
        expect(configSummary(configFixture({ slurm: { ...slurm, nodes: 1 } }))).toBe('Slurm · cpu · 1 node · MANYBODY OPENMP');
    });

    it('leaves the packages out of a core-only build', () => {
        expect(configSummary(configFixture({ packages: [] }))).toBe('8 MPI × 2 OpenMP');
    });
});

describe('versionText', () => {
    it('names a stable release by its date', () => {
        expect(versionText('stable_22Jul2025_update1')).toBe('LAMMPS 22 Jul 2025');
    });

    it('keeps the name of a branch', () => {
        expect(versionText('develop')).toBe('LAMMPS develop');
        expect(versionText('patch_10Sep2025')).toBe('LAMMPS patch_10Sep2025');
    });
});

describe('statusbarOf', () => {
    it('lists the machine, the image, the version and the parallel layout on the left', () => {
        expect(texts(statusbarOf(context()).left)).toEqual(['This computer', 'lammps/lammps-runtime:3f9a0c21b7e4', 'LAMMPS 22 Jul 2025', '8 MPI × 2 OpenMP']);
    });

    it('hides the image on narrow windows', () => {
        expect(statusbarOf(context()).left.filter((item) => item.wideOnly).map((item) => item.key)).toEqual(['image']);
    });

    it('marks the build as pending until it is ready', () => {
        expect(texts(statusbarOf(context({ build: null })).left)[1]).toBe('build pending');
        expect(texts(statusbarOf(context({ build: buildFixture({ status: 'building' }) })).left)[1]).toBe('build pending');
    });

    it('shows the speed of a running run', () => {
        expect(texts(statusbarOf(context({ phase: 'running', run: runFixture('running') })).status)).toEqual(['641 steps/s']);
    });

    it('shows no speed while the agent has not measured it yet', () => {
        const warming = runFixture('running', { progress: { step: 0, totalSteps: 500_000, section: 2, sections: 2, stepsPerSecond: null } });

        expect(statusbarOf(context({ phase: 'running', run: warming })).status).toEqual([]);
        expect(statusbarOf(context({ phase: 'running', run: { ...warming, progress: { ...warming.progress, stepsPerSecond: 0 } } })).status).toEqual([]);
    });

    it('shows a spinner while LAMMPS compiles', () => {
        const [item] = statusbarOf(context({ phase: 'building' })).status;

        expect(item).toMatchObject({ text: 'Compiling on This computer', spin: true });
    });

    it.each([
        ['idle', 'Ready'],
        ['completed', 'Ready'],
        ['noscript', 'No entry script']
    ] as const)('says a %s simulation is %s', (phase, text) => {
        expect(texts(statusbarOf(context({ phase })).status)).toEqual([text]);
    });

    it('ends with the entry script, or says there is none', () => {
        expect(statusbarOf(context()).entry.text).toBe('main.in');
        expect(statusbarOf(context({ entry: null })).entry.text).toBe('no entry script');
    });
});
