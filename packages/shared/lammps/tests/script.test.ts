import { describe, expect, it } from 'vitest';
import mainScript from './fixtures/nanowire/main.in?raw';
import setupScript from './fixtures/nanowire/setup.lammps?raw';
import waterScript from './fixtures/water-box/water.lmp?raw';
import waterSetup from './fixtures/water-box/setup.lammps?raw';
import { analyseScript } from '../src/script/analyse-script';
import { readStatements, splitWords, substitute } from '../src/script/read-statements';
import { ScriptFile } from '../src/script/domain';

const NANOWIRE: ScriptFile[] = [
    { path: 'main.in', text: mainScript },
    { path: 'setup.lammps', text: setupScript }
];

const lineOf = (text: string, fragment: string): number => text.split('\n').findIndex((line) => line.includes(fragment)) + 1;

describe('analyseScript on a real nanowire script', () => {
    const info = analyseScript('main.in', NANOWIRE);

    it('reads every variable with its style and value, keeping the first index definition like LAMMPS', () => {
        expect(info.variables.map(({ name, style, value, overridable }) => [name, style, value, overridable])).toEqual([
            ['thermo_every', 'equal', '50', false],
            ['T', 'index', '300', true],
            ['erate', 'index', '0.001', true],
            ['seed', 'index', '48213', true],
            ['L', 'equal', '12', false],
            ['steps', 'equal', '400', false],
            ['label', 'string', 'Cu wire #1', false],
            ['tmp', 'equal', 'lz', false],
            ['L0', 'equal', '${tmp}', false],
            ['strain', 'equal', '(lz-v_L0)/v_L0', false],
            ['stress', 'equal', '-pzz/10000', false]
        ]);
    });

    it('gives variables from an included file the line of the include', () => {
        const thermoEvery = info.variables.find((variable) => variable.name === 'thermo_every');

        expect(thermoEvery?.line).toBe(lineOf(mainScript, 'include'));
    });

    it('lists computes and fixes with substituted arguments and their lines', () => {
        expect(info.computes.map(({ id, group, style, args }) => [id, group, style, args])).toEqual([
            ['msd', 'all', 'msd', ''],
            ['pe', 'all', 'pe/atom', ''],
            ['cna', 'all', 'cna/atom', '3.08']
        ]);
        expect(info.fixes).toEqual([
            { id: 'nvt', group: 'all', style: 'nvt', args: 'temp 300 300 0.1', line: lineOf(mainScript, 'fix             nvt') },
            { id: 'pull', group: 'all', style: 'deform', args: '1 z erate 0.001 units box remap x', line: lineOf(mainScript, 'fix             pull') }
        ]);
    });

    it('joins & continuations into one dump with its columns', () => {
        expect(info.dumps).toEqual([{
            id: 'traj',
            group: 'all',
            style: 'custom',
            every: 100,
            file: 'wire.lammpstrj',
            columns: ['id', 'type', 'x', 'y', 'z', 'c_pe', 'c_cna'],
            line: lineOf(mainScript, 'dump            traj')
        }]);
    });

    it('reads both runs, resolving ${steps}, and the last thermo interval', () => {
        expect(info.runs).toEqual([
            { line: lineOf(mainScript, 'run             ${steps}'), steps: 400 },
            { line: lineOf(mainScript, 'run             400'), steps: 400 }
        ]);
        expect(info.thermoEvery).toBe(50);
    });

    it('needs MANYBODY for eam/alloy and nothing for the core styles', () => {
        expect(info.requiredPackages).toEqual([
            { name: 'MANYBODY', reason: 'pair_style eam/alloy', line: lineOf(mainScript, 'pair_style') }
        ]);
    });

    it('describes the entry and its length', () => {
        expect(info.entry).toBe('main.in');
        expect(info.lines).toBe(mainScript.split('\n').length - 1);
    });

    it('takes the unit style from the included setup file', () => {
        expect(info.units).toBe('metal');
    });
});

describe('units', () => {
    it('reads real units from the water box', () => {
        const water = analyseScript('water.lmp', [{ path: 'water.lmp', text: waterScript }, { path: 'setup.lammps', text: waterSetup }]);

        expect(water.units).toBe('real');
    });

    it('falls back to lj, the LAMMPS default, without a units command', () => {
        expect(analyseScript('in.melt', [{ path: 'in.melt', text: 'run 100\n' }]).units).toBe('lj');
    });
});

describe('requiredPackages', () => {
    it.each([
        ['pair_style tersoff', 'MANYBODY', 'pair_style tersoff'],
        ['pair_style sw', 'MANYBODY', 'pair_style sw'],
        ['pair_style meam/spline', 'MANYBODY', 'pair_style meam/spline'],
        ['pair_style meam', 'MEAM', 'pair_style meam'],
        ['kspace_style pppm 1e-4', 'KSPACE', 'kspace_style pppm'],
        ['bond_style harmonic', 'MOLECULE', 'bond_style harmonic'],
        ['atom_style full', 'MOLECULE', 'atom_style full'],
        ['fix 1 all rigid/small molecule', 'RIGID', 'fix rigid/small'],
        ['fix 2 all shake 1e-4 100 0 b 1', 'RIGID', 'fix shake'],
        ['pair_style reaxff NULL', 'REAXFF', 'pair_style reaxff'],
        ['pair_style snap', 'ML-SNAP', 'pair_style snap'],
        ['fix 3 all gcmc 10 100 100 1 29494 300 -0.5 0.01', 'MC', 'fix gcmc'],
        ['fix 4 all atom/swap 1 1 29494 300 ke yes types 1 2', 'MC', 'fix atom/swap'],
        ['compute v all voronoi/atom', 'VORONOI', 'compute voronoi/atom'],
        ['neb 0.0 0.01 100 100 10 final final.coords', 'REPLICA', 'neb'],
        ['prd 1000 100 10 10 100 1 54982', 'REPLICA', 'prd'],
        ['compute s all stress/mop z center kin', 'EXTRA-COMPUTE', 'compute stress/mop'],
        ['fix 5 all ttm 1 1 1 1 1 1 1 1 1 1', 'EXTRA-FIX', 'fix ttm'],
        ['pair_style lj/gromacs 9 12', 'EXTRA-PAIR', 'pair_style lj/gromacs'],
        ['dump 1 all custom/gz 100 dump.gz id x y z', 'COMPRESS', 'dump custom/gz']
    ])('%s needs %s', (command, name, reason) => {
        const { requiredPackages } = analyseScript('in.test', [{ path: 'in.test', text: `${command}\n` }]);

        expect(requiredPackages).toEqual([{ name, reason, line: 1 }]);
    });

    it('reads accelerator suffixes, hybrid substyles and the suffix command', () => {
        const text = 'pair_style hybrid/overlay eam/alloy/omp lj/cut 2.5 coul/long 10.0\nsuffix opt\n';
        const { requiredPackages } = analyseScript('in.test', [{ path: 'in.test', text }]);

        expect(requiredPackages.map(({ name, reason }) => [name, reason])).toEqual([
            ['MANYBODY', 'pair_style eam/alloy/omp'],
            ['OPENMP', 'pair_style eam/alloy/omp'],
            ['KSPACE', 'pair_style coul/long'],
            ['OPT', 'suffix opt']
        ]);
    });

    it('collects packages from included files once each', () => {
        const files: ScriptFile[] = [
            { path: 'water.lmp', text: waterScript },
            { path: 'setup.lammps', text: waterSetup }
        ];

        expect(analyseScript('water.lmp', files).requiredPackages.map((entry) => entry.name)).toEqual(['MOLECULE', 'KSPACE', 'RIGID']);
    });

    it('stops on an include cycle', () => {
        const files: ScriptFile[] = [
            { path: 'a.in', text: 'include b.in\nrun 10\n' },
            { path: 'b.in', text: 'include ./a.in\nrun 20\n' }
        ];

        expect(analyseScript('a.in', files).runs.map((run) => run.steps)).toEqual([20, 10]);
    });
});

describe('reading statements', () => {
    it('joins continuations and drops comments outside quotes', () => {
        const statements = readStatements('fix 1 all deform 1 &\n   z erate 0.1  # strain rate\nprint "a # b" # tail\n');

        expect(statements).toEqual([
            { line: 1, text: 'fix 1 all deform 1     z erate 0.1' },
            { line: 3, text: 'print "a # b"' }
        ]);
    });

    it('splits words on whitespace, keeping quoted text as one word', () => {
        expect(splitWords(`print "T is \${T}" 'single quoted' """triple "quoted" text"""`)).toEqual([
            'print',
            'T is ${T}',
            'single quoted',
            'triple "quoted" text'
        ]);
    });

    it.each([
        ['velocity all create $T ${seed}', 'velocity all create 300 48213'],
        ['print "no ${T} inside quotes"', 'print "no ${T} inside quotes"'],
        ['region box block 0 ${missing} 0 1 0 1', 'region box block 0 ${missing} 0 1 0 1'],
        ['variable x equal $(v_T*2)', 'variable x equal $(v_T*2)']
    ])('substitutes %j as %j', (text, expected) => {
        const values: Record<string, string> = { T: '300', seed: '48213' };

        expect(substitute(text, (name) => values[name] ?? null)).toBe(expected);
    });
});
