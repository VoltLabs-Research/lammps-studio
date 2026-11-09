import { describe, expect, it } from 'vitest';
import { buildFixture, configFixture, machineFixture, runFixture, scriptFixture, simulationFixture } from '@/modules/run-control/tests/fixtures';
import { buildFor, typicalBuildMinutes } from '@/modules/run-settings/utils/build-match';
import { initialDraft, partitionsOf } from '@/modules/run-settings/utils/draft-defaults';
import { acceleratorPatch, machinePatch } from '@/modules/run-settings/utils/draft-edits';
import { orderedPackages, toggledPackage, withAccelerator, withRequired } from '@/modules/run-settings/utils/draft-packages';

const atlas = machineFixture({
    id: 'atlas',
    name: 'atlas',
    kind: 'slurm',
    cores: 128,
    gpus: 4,
    scheduler: 'Slurm 23.11 · cpu, gpu, debug'
});

describe('initialDraft', () => {
    it('repeats the settings of the latest run', () => {
        const latest = runFixture('completed', { config: configFixture({ mpiRanks: 4, variables: { T: '500' } }) });
        const draft = initialDraft({ simulation: simulationFixture(), machine: machineFixture(), latestRun: latest, script: null });

        expect(draft).toEqual(latest.config);
    });

    it('takes the entry the simulation uses now over the one the run used', () => {
        const latest = runFixture('completed', { config: configFixture({ entry: 'old.in' }) });
        const draft = initialDraft({ simulation: simulationFixture({ entry: 'main.in' }), machine: machineFixture(), latestRun: latest, script: null });

        expect(draft.entry).toBe('main.in');
    });

    it('builds the packages the script needs with OpenMP on a machine with cores to spare', () => {
        const script = scriptFixture({ requiredPackages: [
            { name: 'MANYBODY', reason: 'pair_style eam/alloy', line: 12 },
            { name: 'MANYBODY', reason: 'pair_coeff', line: 13 },
            { name: 'EXTRA-COMPUTE', reason: 'compute cna/atom', line: 20 }
        ] });
        const draft = initialDraft({ simulation: simulationFixture(), machine: machineFixture(), latestRun: null, script });

        expect(draft).toEqual(configFixture({ packages: ['MANYBODY', 'EXTRA-COMPUTE', 'OPENMP'] }));
    });

    it('runs one rank without threads when the machine is unknown', () => {
        const draft = initialDraft({ simulation: simulationFixture(), machine: null, latestRun: null, script: null });

        expect(draft).toMatchObject({ mpiRanks: 1, threadsPerRank: 1, accelerator: 'none', packages: [] });
    });

    it('fills a Slurm job for a cluster and caps the ranks', () => {
        const draft = initialDraft({ simulation: simulationFixture({ machineId: 'atlas' }), machine: atlas, latestRun: null, script: null });

        expect(draft).toMatchObject({ machineId: 'atlas', mpiRanks: 64, slurm: { partition: 'cpu', nodes: 1, time: '04:00:00', account: '' } });
    });

    it('falls back to main.in when nothing names an entry', () => {
        const draft = initialDraft({ simulation: simulationFixture({ entry: null }), machine: machineFixture(), latestRun: null, script: null });

        expect(draft.entry).toBe('main.in');
    });
});

describe('partitionsOf', () => {
    it('reads the partitions the scheduler lists', () => {
        expect(partitionsOf(atlas)).toEqual(['cpu', 'gpu', 'debug']);
        expect(partitionsOf(machineFixture())).toEqual([]);
    });
});

describe('draft packages', () => {
    it('keeps one accelerator package at a time', () => {
        expect(withAccelerator(['MANYBODY', 'OPENMP'], 'kokkos')).toEqual(['MANYBODY', 'KOKKOS']);
        expect(withAccelerator(['MANYBODY', 'OPENMP'], 'none')).toEqual(['MANYBODY']);
    });

    it('orders packages like the catalog and keeps unknown ones last', () => {
        expect(orderedPackages(['OPENMP', 'DPD-BASIC', 'KSPACE', 'MANYBODY'])).toEqual(['MANYBODY', 'KSPACE', 'OPENMP', 'DPD-BASIC']);
    });

    it('toggles a package in and out', () => {
        expect(toggledPackage(['MANYBODY', 'OPENMP'], 'KSPACE')).toEqual(['MANYBODY', 'KSPACE', 'OPENMP']);
        expect(toggledPackage(['MANYBODY', 'KSPACE', 'OPENMP'], 'KSPACE')).toEqual(['MANYBODY', 'OPENMP']);
    });

    it('adds the packages the script needs and keeps the list when nothing is missing', () => {
        const packages = ['OPENMP'];

        expect(withRequired(packages, ['RIGID', 'KSPACE'])).toEqual(['KSPACE', 'RIGID', 'OPENMP']);
        expect(withRequired(packages, ['OPENMP'])).toBe(packages);
    });

    it('adds a package the latest run lacked but the script now needs', () => {
        const latest = runFixture('failed', { config: configFixture({ packages: [], accelerator: 'none' }) });
        const draft = initialDraft({ simulation: simulationFixture(), machine: machineFixture(), latestRun: latest, script: scriptFixture() });

        expect(draft.packages).toEqual(['MANYBODY']);
    });
});

describe('draft edits', () => {
    it('swaps the accelerator package with the accelerator', () => {
        expect(acceleratorPatch(configFixture(), 'gpu')).toEqual({ accelerator: 'gpu', packages: ['MANYBODY', 'GPU'] });
    });

    it('starts a Slurm job when the next run moves to a cluster and drops it when it moves back', () => {
        const toAtlas = machinePatch(configFixture({ gpus: 6 }), atlas);

        expect(toAtlas).toMatchObject({ machineId: 'atlas', gpus: 4, slurm: { partition: 'cpu' } });
        expect(machinePatch(configFixture({ ...toAtlas }), machineFixture())).toMatchObject({ machineId: 'local', gpus: 0, slurm: null });
    });
});

describe('buildFor', () => {
    const builds = [buildFixture(), buildFixture({ hash: 'a1', machineId: 'atlas' }), buildFixture({ hash: 'f1', packages: ['KSPACE'], status: 'failed' })];

    it('finds the build for the machine, version and packages in any order', () => {
        expect(buildFor(builds, configFixture({ packages: ['OPENMP', 'MANYBODY'] }))?.hash).toBe('3f9a0c21b7e4');
        expect(buildFor(builds, configFixture({ machineId: 'atlas' }))?.hash).toBe('a1');
    });

    it('needs a new build for other packages, another version or after a failure', () => {
        expect(buildFor(builds, configFixture({ packages: ['MANYBODY'] }))).toBeNull();
        expect(buildFor(builds, configFixture({ version: 'develop' }))).toBeNull();
        expect(buildFor(builds, configFixture({ packages: ['KSPACE'] }))).toBeNull();
    });

    it('estimates a new build from the ones that finished on the machine', () => {
        expect(typicalBuildMinutes([buildFixture({ buildSeconds: 408 }), buildFixture({ buildSeconds: 432 })], 'local')).toBe(7);
        expect(typicalBuildMinutes(builds, 'gpu')).toBeNull();
    });
});
