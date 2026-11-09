import type { Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { describe, expect, it } from 'vitest';
import { computeNote, dumpOutput, dumpSummary, fixNote } from '@/modules/variables/utils/command-notes';
import { THERMO_COMPUTES, thermoComputeNote } from '@/modules/variables/utils/thermo-computes';
import { isTabEmpty, thermoColumnsOf, variableRows, variablesSub } from '@/modules/variables/utils/variable-rows';

const SCRIPT: ScriptInfo = {
    entry: 'main.in',
    lines: 52,
    variables: [
        { name: 'T', style: 'index', value: '300', line: 8, overridable: true },
        { name: 'seed', style: 'index', value: '48213', line: 10, overridable: true },
        { name: 'L', style: 'equal', value: '40', line: 11, overridable: false },
        { name: 'L0', style: 'equal', value: '${tmp}', line: 37, overridable: false },
        { name: 'strain', style: 'equal', value: '(lz-v_L0)/v_L0', line: 38, overridable: false }
    ],
    computes: [
        { id: 'pe', group: 'all', style: 'pe/atom', args: '', line: 25 },
        { id: 'cna', group: 'all', style: 'cna/atom', args: '3.08', line: 26 },
        { id: 'msd', group: 'all', style: 'msd', args: '', line: 27 }
    ],
    fixes: [
        { id: 'nvt', group: 'all', style: 'nvt', args: 'temp 300 300 0.1', line: 30 },
        { id: 'pull', group: 'all', style: 'deform', args: '1 z erate 0.001 units box remap x', line: 41 },
        { id: 'late', group: 'all', style: 'print', args: 'done', line: 50 }
    ],
    dumps: [{ id: 'traj', group: 'all', style: 'custom', every: 2000, file: 'wire.lammpstrj', columns: ['id', 'type', 'x', 'y', 'z', 'c_pe', 'c_cna'], line: 44 }],
    runs: [{ line: 33, steps: 20000 }, { line: 46, steps: 500000 }],
    requiredPackages: [],
    thermoEvery: 1000,
    units: 'metal'
};

const THERMO: ThermoSection[] = [
    { section: 1, columns: ['Step', 'Temp', 'PotEng'], rows: [[0, 300, -1]] },
    { section: 2, columns: ['Step', 'Temp', 'v_strain', 'c_msd[4]'], rows: [[0, 300, 0, 0], [184000, 301, 0.18604, 0.2]] }
];

const runWith = (variables: Record<string, string>): Run => ({
    simulationId: 'cu',
    number: 3,
    state: 'running',
    startedAt: '2026-11-08T12:18:00.000Z',
    endedAt: null,
    progress: { step: 184000, totalSteps: 500000, section: 2, sections: 2, stepsPerSecond: 640 },
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
        variables
    },
    buildHash: '3f9a0c21b7e4',
    outputDir: 'runs/run-3',
    frames: 0,
    warnings: 0
});

const rowNamed = (name: string, rows: ReturnType<typeof variableRows>) => {
    const row = rows.find((candidate) => candidate.name === name);
    if(!row) throw new Error(`no row ${name}`);

    return row;
};

describe('the variable rows', () => {
    it('lets only index and loop variables take an override', () => {
        const rows = variableRows(SCRIPT, null, [], null);

        expect(rows.map((row) => [row.name, row.editable])).toEqual([['T', true], ['seed', true], ['L', false], ['L0', false], ['strain', false]]);
    });

    it('shows the next run’s override and leaves the rest empty', () => {
        const rows = variableRows(SCRIPT, null, [], { T: '350' });

        expect(rowNamed('T', rows).override).toBe('350');
        expect(rowNamed('seed', rows).override).toBe('');
    });

    it('reads a live value from the last thermo row with four digits', () => {
        expect(rowNamed('strain', variableRows(SCRIPT, null, THERMO, null)).current).toBe('0.1860');
    });

    it('shows the value the viewed run used before the script’s own', () => {
        expect(rowNamed('T', variableRows(SCRIPT, runWith({ T: '400' }), [], null)).current).toBe('400');
        expect(rowNamed('T', variableRows(SCRIPT, runWith({}), [], null)).current).toBe('300');
    });

    it('shows a dash for a formula it cannot evaluate and the number for a constant one', () => {
        const rows = variableRows(SCRIPT, null, [], null);

        expect(rowNamed('L0', rows).current).toBe('—');
        expect(rowNamed('strain', rows).current).toBe('—');
        expect(rowNamed('L', rows).current).toBe('40');
    });
});

describe('the compute notes', () => {
    const columns = thermoColumnsOf(THERMO);

    it('names the scope and the dumps that write a compute', () => {
        expect(computeNote(SCRIPT.computes[0], SCRIPT, columns)).toBe('Per atom · in dump traj');
    });

    it('says the structure compute colours the viewport when a dump writes it', () => {
        expect(computeNote(SCRIPT.computes[1], SCRIPT, columns)).toBe('Per atom · in dump traj · colors the viewport');
    });

    it('notes a global compute that thermo prints, by element too', () => {
        expect(computeNote(SCRIPT.computes[2], SCRIPT, columns)).toBe('Global · in thermo');
        expect(computeNote(SCRIPT.computes[2], SCRIPT, [])).toBe('Global');
    });

    it('names the thermo column an implicit thermo compute feeds', () => {
        const [temp, press] = THERMO_COMPUTES;

        expect(thermoComputeNote(temp, columns)).toBe('Global · thermo Temp');
        expect(thermoComputeNote(press, columns)).toBe('Global');
    });
});

describe('the fix notes', () => {
    it('says which run commands a fix is active in', () => {
        expect(fixNote(SCRIPT.fixes[0], SCRIPT)).toBe('Line 30 · active in both runs');
        expect(fixNote(SCRIPT.fixes[1], SCRIPT)).toBe('Line 41 · active in run 2');
    });

    it('gives only the line for a fix after the last run', () => {
        expect(fixNote(SCRIPT.fixes[2], SCRIPT)).toBe('Line 50');
    });

    it('counts every run when a fix precedes more than two', () => {
        const three = { ...SCRIPT, runs: [...SCRIPT.runs, { line: 49, steps: 1000 }] };

        expect(fixNote(SCRIPT.fixes[0], three)).toBe('Line 30 · active in all runs');
        expect(fixNote(SCRIPT.fixes[1], three)).toBe('Line 41 · active in runs 2–3');
    });
});

describe('the dump rows', () => {
    it('summarise the style and interval, then the file and its columns', () => {
        expect(dumpSummary(SCRIPT.dumps[0])).toBe('custom · every 2,000 steps');
        expect(dumpOutput(SCRIPT.dumps[0])).toBe('wire.lammpstrj · id type x y z c_pe c_cna');
    });
});

describe('the panel chrome', () => {
    it('names the entry and the viewed run', () => {
        expect(variablesSub('main.in', 3)).toBe('main.in · run 3');
        expect(variablesSub('water.lmp', null)).toBe('water.lmp');
    });

    it('treats a tab as empty when the script declares none, except computes', () => {
        const bare = { ...SCRIPT, variables: [], computes: [], fixes: [], dumps: [] };

        expect(isTabEmpty(bare, 'variables')).toBe(true);
        expect(isTabEmpty(bare, 'fixes')).toBe(true);
        expect(isTabEmpty(bare, 'dumps')).toBe(true);
        expect(isTabEmpty(bare, 'computes')).toBe(false);
        expect(isTabEmpty(SCRIPT, 'fixes')).toBe(false);
    });
});
