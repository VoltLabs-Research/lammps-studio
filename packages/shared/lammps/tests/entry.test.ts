import { describe, expect, it } from 'vitest';
import waterScript from './fixtures/water-box/water.lmp?raw';
import waterSetup from './fixtures/water-box/setup.lammps?raw';
import boxData from './fixtures/water-box/box.data?raw';
import readme from './fixtures/water-box/README.md?raw';
import { defaultEntry, resolveEntry } from '../src/script/resolve-entry';
import { ScriptFile } from '../src/script/domain';

describe('resolveEntry', () => {
    const waterBox: ScriptFile[] = [
        { path: 'README.md', text: readme },
        { path: 'box.data', text: boxData },
        { path: 'setup.lammps', text: waterSetup },
        { path: 'water.lmp', text: waterScript }
    ];

    it('ranks a folder without main.in like the picker: the script with a run, its include, the data file, then text', () => {
        expect(resolveEntry(waterBox)).toEqual([
            { path: 'water.lmp', lines: 21, hint: '21 lines · has a run command', likely: true },
            { path: 'setup.lammps', lines: 7, hint: '7 lines · included by water.lmp', likely: false },
            { path: 'box.data', lines: 82, hint: 'data file · 32 atoms', likely: false },
            { path: 'README.md', lines: 3, hint: 'text', likely: false }
        ]);
    });

    it.each([
        [['other.in', 'main.in', 'water.lmp'], 'main.in'],
        [['water.lmp', 'in.melt'], 'in.melt'],
        [['inputs/deep.in', 'top.in'], 'top.in']
    ])('puts main.in first, then other input scripts (%j → %s)', (paths, first) => {
        const files = paths.map((path) => ({ path, text: 'units lj\nrun 10\n' }));

        expect(resolveEntry(files)[0]).toMatchObject({ path: first, likely: true });
    });

    it('does not offer an included .in file as the entry', () => {
        const candidates = resolveEntry([
            { path: 'settings.in', text: 'units metal\nboundary p p p\n' },
            { path: 'job.lmp', text: 'include settings.in\nrun 100\n' }
        ]);

        expect(candidates.map(({ path, likely }) => [path, likely])).toEqual([['job.lmp', true], ['settings.in', false]]);
    });

    it('marks nothing as likely when the folder holds no script', () => {
        const candidates = resolveEntry([
            { path: 'README.md', text: readme },
            { path: 'box.data', text: boxData }
        ]);

        expect(candidates.map((candidate) => candidate.likely)).toEqual([false, false]);
    });
});

describe('defaultEntry', () => {
    const script = (path: string, text = 'units lj\nrun 10\n'): ScriptFile => ({ path, text });

    it.each([
        [['other.in', 'main.in'], 'main.in'],
        [['b.in', 'a.in', 'z.lmp'], 'a.in'],
        [['water.lmp', 'in.melt'], 'in.melt'],
        [['inputs/shear.in'], 'inputs/shear.in']
    ])('takes main.in, then an input script nothing includes (%j → %s)', (paths, entry) => {
        expect(defaultEntry(paths.map((path) => script(path)))).toBe(entry);
    });

    it('leaves the choice to the user when no file is named like an entry script', () => {
        expect(defaultEntry([script('water.lmp', 'include setup.lammps\nrun 1000\n'), script('setup.lammps', 'units real\n')])).toBeNull();
        expect(defaultEntry([])).toBeNull();
    });

    it('does not take an input script another one includes', () => {
        expect(defaultEntry([script('settings.in', 'units metal\n'), script('job.lmp', 'include settings.in\nrun 100\n')])).toBeNull();
    });
});
