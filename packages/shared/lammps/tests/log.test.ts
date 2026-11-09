import { describe, expect, it } from 'vitest';
import meltLog from './fixtures/log.melt.lammps?raw';
import meltStdout from './fixtures/melt.stdout?raw';
import minimizeStdout from './fixtures/minimize-run.stdout?raw';
import overflowStdout from './fixtures/neighbor-overflow.stdout?raw';
import LogReader from '../src/log/LogReader';
import { parseLog } from '../src/log/parse-log';
import { META_PREFIX } from '../src/log/domain';

const RUN_ONE_COLUMNS = ['Step', 'Temp', 'E_pair', 'E_mol', 'TotEng', 'Press'];
const RUN_TWO_COLUMNS = ['Step', 'Temp', 'PotEng', 'Press', 'v_msd'];

describe('parseLog on a real LJ melt', () => {
    it.each([
        ['log.lammps', meltLog],
        ['the screen stream', meltStdout]
    ])('splits %s into one thermo section per run with its own columns', (_, text) => {
        const { sections } = parseLog(text);

        expect(sections.map((section) => section.columns)).toEqual([RUN_ONE_COLUMNS, RUN_TWO_COLUMNS]);
        expect(sections.map((section) => section.rows.map((row) => row[0]))).toEqual([
            [0, 50, 100, 150, 200, 250],
            [250, 275, 300, 325, 350]
        ]);
        expect(sections[0].rows[0]).toEqual([0, 3, -6.7733681, 0, -2.2744931, -3.7033504]);
        expect(sections[1].rows.at(-1)).toEqual([350, 1.6631594, -4.7752345, 5.7734419, 0.83157968]);
    });

    it('reads the step totals from the echoed run commands in log.lammps', () => {
        const reader = new LogReader();
        const totals: Array<number | null> = [];
        for(const line of meltLog.split('\n')){
            const { line: read } = reader.read(line);
            if(read.kind === 'head' && read.text.trim().startsWith('Step')){
                totals.push(reader.totalSteps);
            }
        }

        expect(totals).toEqual([250, 100]);
    });

    it('has no step total on the screen stream, which does not echo commands', () => {
        expect(parseLog(meltStdout).totalSteps).toBeNull();
    });

    it('reports a clean run as no error, no warnings and its last step', () => {
        const { error, warnings, lastStep } = parseLog(meltLog);

        expect(error).toBeNull();
        expect(warnings).toBe(0);
        expect(lastStep).toBe(350);
    });

    it.each([
        ['LAMMPS (22 Jul 2025 - Update 1)', 'head'],
        ['   Step          Temp          E_pair         E_mol          TotEng         Press     ', 'head'],
        ['       100   1.6712577     -4.7875609      0             -2.281301       5.6613913    ', 'thermo'],
        ['Loop time of 0.126176 on 4 procs for 250 steps with 4000 atoms', 'text'],
        ['Per MPI rank memory allocation (min/avg/max) = 2.706 | 2.706 | 2.706 Mbytes', 'text'],
        ['run             250', 'text']
    ])('classifies %j as %s', (text, kind) => {
        const line = parseLog(meltLog).lines.find((entry) => entry.text === text);

        expect(line?.kind).toBe(kind);
    });

    it('numbers every line in order', () => {
        const { lines } = parseLog(meltLog);

        expect(lines.map((line) => line.index)).toEqual(lines.map((_, index) => index));
        expect(lines).toHaveLength(118);
    });
});

describe('parseLog on a failed run', () => {
    it('extracts the ERROR on proc message without its source location, and the last thermo step before it', () => {
        const { error, lines } = parseLog(overflowStdout);

        expect(error).toEqual({
            message: 'Neighbor list overflow, boost neigh_modify one',
            step: 50,
            line: lines.findIndex((line) => line.text.startsWith('ERROR on proc 5'))
        });
    });

    it('marks the error line as an error and stops reading thermo after it', () => {
        const { lines, sections } = parseLog(overflowStdout);
        const errorLine = lines.find((line) => line.text.startsWith('ERROR on proc 5'));

        expect(errorLine?.kind).toBe('error');
        expect(sections[0].rows.map((row) => row[0])).toEqual([0, 50]);
    });

    it.each([
        ['ERROR: Lost atoms: original 32000 current 31998 (src/thermo.cpp:488)', 'Lost atoms: original 32000 current 31998'],
        ['ERROR on proc 0: Cannot open file potentials/Cu01.eam.alloy: No such file or directory (src/potential_file_reader.cpp:59)', 'Cannot open file potentials/Cu01.eam.alloy: No such file or directory'],
        ['ERROR: Unrecognized pair style \'eam/alloy\' is part of the MANYBODY package which is not enabled in this LAMMPS binary.', 'Unrecognized pair style \'eam/alloy\' is part of the MANYBODY package which is not enabled in this LAMMPS binary.']
    ])('extracts the message of %j', (text, message) => {
        expect(parseLog(text).error).toEqual({ message, step: null, line: 0 });
    });

    it('keeps the first error when several ranks report one', () => {
        const { error } = parseLog('ERROR on proc 3: first\nERROR on proc 1: second\n');

        expect(error?.message).toBe('first');
    });
});

describe('LogReader', () => {
    const kindsOf = (text: string): string[] => {
        const reader = new LogReader();
        text.split('\n').forEach((line) => reader.read(line));

        return reader.sectionKinds;
    };

    it('tells a minimization section from the run after it on the screen stream', () => {
        const reader = new LogReader();
        minimizeStdout.split('\n').forEach((line) => reader.read(line));

        expect(reader.sectionKinds).toEqual(['minimize', 'run']);
        expect(reader.sections.map((section) => section.rows.map((row) => row[0]))).toEqual([[0, 1], [1, 10, 20, 30, 40, 41]]);
    });

    it('takes every section of a script without minimize for a run', () => {
        expect(kindsOf(meltStdout)).toEqual(['run', 'run']);
        expect(kindsOf(meltLog)).toEqual(['run', 'run']);
    });
    it('counts warnings from any rank and classifies them', () => {
        const reader = new LogReader();
        const kinds = [
            'WARNING: Too many neighbors in CNA for 3 atoms (src/compute_cna_atom.cpp:180)',
            'WARNING on proc 2: Inconsistent image flags (src/domain.cpp:815)',
            'This is not a WARNING: line'
        ].map((text) => reader.read(text).line.kind);

        expect(kinds).toEqual(['warning', 'warning', 'text']);
        expect(reader.warnings).toBe(2);
    });

    it('keeps reading thermo rows across a warning in the middle of a run', () => {
        const reader = new LogReader();
        const lines = [
            'Per MPI rank memory allocation (min/avg/max) = 4.112 | 4.118 | 4.125 Mbytes',
            '   Step          Temp     ',
            '   150000   300.1',
            'WARNING: Too many neighbors in CNA for 3 atoms (src/compute_cna_atom.cpp:180)',
            '   151000   -nan',
            '   152000   inf'
        ];
        const rows = lines.map((text) => reader.read(text).thermo?.values ?? null).filter((values) => values !== null);

        expect(rows).toEqual([[150000, 300.1], [151000, Number.NaN], [152000, Infinity]]);
        expect(reader.lastStep).toBe(152000);
    });

    it('hands back each thermo row with its section and columns as it is fed', () => {
        const reader = new LogReader();
        const rows = meltLog.split('\n').map((line) => reader.read(line).thermo).filter((row) => row !== null);

        expect(rows).toHaveLength(11);
        expect(rows[6]).toEqual({ section: 1, columns: RUN_TWO_COLUMNS, values: [250, 1.6645597, -4.7774368, 5.752602, 0.83227983] });
    });

    it('classifies the lines Studio adds as meta', () => {
        const reader = new LogReader();

        expect(reader.read(`${META_PREFIX}run 3 on This computer · build 8ec0c210e389`).line.kind).toBe('meta');
    });
});
