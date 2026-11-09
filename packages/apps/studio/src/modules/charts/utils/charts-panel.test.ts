import type { Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { describe, expect, it } from 'vitest';
import { chartedSection, chartEndStep, chartsSub } from '@/modules/charts/utils/charts-panel';
import { thermoCsv, thermoFileName, thermoGnuplot, thermoYaml } from '@/modules/charts/utils/thermo-export';

const EQUILIBRATION: ThermoSection = { section: 0, columns: ['Step', 'Temp'], rows: [[0, 300], [1000, 299.5]] };
const TENSION: ThermoSection = { section: 1, columns: ['Step', 'Temp', 'v_strain'], rows: [[20000, 301, 0], [21000, 302.25, 0.001], [22000, 300.5, 0.002]] };

const run = (totalSteps: number | null): Run => ({
    simulationId: 'cu',
    number: 3,
    state: 'running',
    startedAt: '2026-11-08T12:18:00.000Z',
    endedAt: null,
    progress: { step: 2000, totalSteps, section: 2, sections: 2, stepsPerSecond: 640 },
    error: null,
    config: {
        machineId: 'local',
        version: 'stable',
        packages: [],
        accelerator: 'none',
        mpiRanks: 1,
        threadsPerRank: 1,
        gpus: 0,
        slurm: null,
        entry: 'main.in',
        variables: {}
    },
    buildHash: 'abc',
    outputDir: 'runs/run-3',
    frames: 0,
    warnings: 0
});

const script = (steps: number[]): ScriptInfo => ({
    entry: 'main.in',
    lines: 49,
    variables: [],
    computes: [],
    fixes: [],
    dumps: [],
    runs: steps.map((count, index) => ({ line: 30 + index * 10, steps: count })),
    requiredPackages: [],
    thermoEvery: 1000,
    units: 'metal'
});

describe('the charted thermo section', () => {
    it('is the last section with rows', () => {
        expect(chartedSection([EQUILIBRATION, TENSION])).toBe(TENSION);
        expect(chartedSection([EQUILIBRATION, { ...TENSION, rows: [] }])).toBeNull();
        expect(chartedSection([])).toBeNull();
    });
});

describe('the step a chart runs up to', () => {
    it('adds the run command steps to where the section started', () => {
        expect(chartEndStep([EQUILIBRATION, TENSION], run(500_000), null)).toBe(520_000);
    });

    it('takes the steps from the matching run command when the run does not know them', () => {
        expect(chartEndStep([EQUILIBRATION, TENSION], run(null), script([20_000, 500_000]))).toBe(520_000);
        expect(chartEndStep([EQUILIBRATION], null, script([20_000, 500_000]))).toBe(20_000);
    });

    it('is unknown without progress or a matching run command', () => {
        expect(chartEndStep([EQUILIBRATION, TENSION], run(null), script([20_000]))).toBeNull();
        expect(chartEndStep([], run(500_000), null)).toBeNull();
    });
});

describe('the charts panel head', () => {
    it('counts the rows of the charted section and says when it is live', () => {
        expect(chartsSub([EQUILIBRATION, TENSION], true)).toBe('Thermo · 3 rows · live');
        expect(chartsSub([EQUILIBRATION], false)).toBe('Thermo · 2 rows');
        expect(chartsSub([], true)).toBe('Thermo');
    });
});

describe('exporting thermo', () => {
    it('writes one CSV table, with a section column when there are several', () => {
        expect(thermoCsv([EQUILIBRATION])).toBe('Step,Temp\n0,300\n1000,299.5\n');
        expect(thermoCsv([EQUILIBRATION, TENSION])).toBe([
            'Section,Step,Temp,v_strain',
            '1,0,300,',
            '1,1000,299.5,',
            '2,20000,301,0',
            '2,21000,302.25,0.001',
            '2,22000,300.5,0.002'
        ].join('\n') + '\n');
    });

    it('writes Gnuplot blocks separated by two blank lines', () => {
        expect(thermoGnuplot([EQUILIBRATION, TENSION])).toBe('# Step Temp\n0 300\n1000 299.5\n\n\n# Step Temp v_strain\n20000 301 0\n21000 302.25 0.001\n22000 300.5 0.002\n');
    });

    it('writes one LAMMPS thermo YAML document per section', () => {
        expect(thermoYaml([EQUILIBRATION])).toBe("---\nkeywords: ['Step', 'Temp']\ndata:\n  - [0, 300]\n  - [1000, 299.5]\n...\n");
    });

    it('names the file after the run', () => {
        expect(thermoFileName(3, 'csv')).toBe('thermo-run3.csv');
        expect(thermoFileName(null, 'png')).toBe('thermo.png');
    });
});
