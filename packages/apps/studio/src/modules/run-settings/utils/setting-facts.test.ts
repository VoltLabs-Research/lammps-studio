import { describe, expect, it } from 'vitest';
import { buildFixture, machineFixture } from '@/modules/run-control/tests/fixtures';
import { buildStateOf, folderOf, lammpsFoot, machineFoot, packagesText } from '@/modules/run-settings/utils/setting-facts';
import { entryEntries, packageEntries } from '@/modules/run-settings/utils/setting-entries';

const atlas = machineFixture({ id: 'atlas', name: 'atlas', kind: 'slurm', runtime: 'Apptainer 1.3', scheduler: 'Slurm 23.11 · cpu, gpu, debug', root: '/scratch/rherrera/lammps-studio' });

describe('machine facts', () => {
    it('joins the root and the folder', () => {
        expect(folderOf(atlas, 'cu-nanowire-tension')).toBe('/scratch/rherrera/lammps-studio/cu-nanowire-tension');
    });

    it('names the runtime and the scheduler without its partitions', () => {
        expect(machineFoot(atlas)).toBe('Apptainer 1.3 · Slurm 23.11');
    });

    it('says a machine without a scheduler runs directly', () => {
        expect(machineFoot(machineFixture())).toBe('Docker 27.3 · no scheduler, runs directly');
    });
});

describe('build facts', () => {
    it('lists the physics packages or says core only', () => {
        expect(packagesText(['MANYBODY', 'KSPACE'])).toBe('MANYBODY, KSPACE');
        expect(packagesText([])).toBe('Core only');
    });

    it('shows the hash of a ready build', () => {
        expect(buildStateOf(buildFixture(), 9)).toEqual({ ready: true, hash: '3f9a0c21b7e4', minutes: 0 });
    });

    it('estimates the compile from past builds while one is missing or in progress', () => {
        expect(buildStateOf(null, 11)).toEqual({ ready: false, hash: null, minutes: 11 });
        expect(buildStateOf(buildFixture({ status: 'building' }), null).minutes).toBe(7);
    });

    it('explains reuse in the footnote', () => {
        expect(lammpsFoot({ ready: false, hash: null, minutes: 7 }, 'atlas')).toBe('Studio builds LAMMPS on atlas once and reuses it after that.');
    });
});

describe('setting entries', () => {
    it('locks the packages the entry script needs', () => {
        const entries = packageEntries({ selected: ['MANYBODY', 'OPENMP'], required: ['MANYBODY'], entry: 'main.in', toggle: () => undefined });
        const manybody = entries.find((entry) => typeof entry === 'object' && 'id' in entry && entry.id === 'MANYBODY');

        expect(manybody).toMatchObject({ hint: 'main.in needs it', checked: true, disabled: true });
        expect(entries.some((entry) => typeof entry === 'object' && 'id' in entry && entry.id === 'OPENMP')).toBe(false);
    });

    it('offers only input scripts as entries, plus another file', () => {
        const candidates = [
            { path: 'water.lmp', lines: 21, hint: '', likely: true },
            { path: 'tip4p.data', lines: 19, hint: '', likely: false },
            { path: 'README.md', lines: 6, hint: '', likely: false }
        ];
        const ids = entryEntries(candidates, null, () => undefined, () => undefined)
            .map((entry) => (typeof entry === 'object' && 'id' in entry ? entry.id : entry));

        expect(ids).toEqual(['water.lmp', 'separator', 'other']);
    });

    it('keeps the current entry even when it is not a candidate', () => {
        const [first] = entryEntries([], 'inputs/run.lammps', () => undefined, () => undefined);

        expect(first).toMatchObject({ id: 'inputs/run.lammps', checked: true });
    });
});
