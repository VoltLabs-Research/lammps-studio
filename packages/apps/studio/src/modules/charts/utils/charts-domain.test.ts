import { describe, expect, it } from 'vitest';
import type { ThermoSection } from '@lammps-studio/contracts/run/domain';
import { bentoColumns, bentoInnerWidth, bentoSpans, featuredSpan, tileWidth } from '@/modules/charts/utils/bento-layout';
import { bentoSeries, findStressStrain, STRESS_STRAIN_KEY } from '@/modules/charts/utils/bento-series';
import { formatValue } from '@/modules/charts/utils/format-value';
import { peakIndex } from '@/modules/charts/utils/peak-index';
import { thermoQuantity } from '@/modules/charts/utils/thermo-quantity';

const TENSION: ThermoSection = {
    section: 2,
    columns: ['Step', 'Temp', 'PotEng', 'Press', 'Lz', 'v_strain', 'v_stress'],
    rows: [
        [0, 300, -62000, 10, 144.6, 0, 0],
        [1000, 301, -61990, -1200, 144.7, 0.001, 0.9],
        [2000, 302, -61980, -2400, 144.9, 0.002, 1.6]
    ]
};

describe('thermoQuantity', () => {
    it.each([
        ['Temp', 'metal', 'Temperature', 'K'],
        ['PotEng', 'metal', 'Potential energy', 'eV'],
        ['TotEng', 'real', 'Total energy', 'kcal/mol'],
        ['Press', 'metal', 'Pressure', 'bar'],
        ['Lz', 'metal', 'Box length Lz', 'Å'],
        ['Volume', 'metal', 'Volume', 'Å³'],
        ['Step', 'metal', 'Step', ''],
        ['Temp', 'lj', 'Temperature', ''],
        ['v_stress', 'metal', 'v_stress', '']
    ] as const)('names %s in %s units', (column, units, label, unit) => {
        expect(thermoQuantity(column, units)).toEqual({ label, unit });
    });
});

describe('findStressStrain', () => {
    it('pairs the strain and stress variables', () => {
        expect(findStressStrain(TENSION.columns)).toEqual({ strain: 'v_strain', stress: 'v_stress' });
    });

    it('needs both columns', () => {
        expect(findStressStrain(['Step', 'Temp', 'v_strain'])).toBeNull();
    });
});

describe('bentoSeries', () => {
    it('leads with stress against strain and drops Step and the strain column', () => {
        const series = bentoSeries(TENSION, 'metal');

        expect(series.map((entry) => entry.key)).toEqual([STRESS_STRAIN_KEY, 'Temp', 'PotEng', 'Press', 'Lz', 'v_stress']);
        expect(series[0].xs).toEqual([0, 0.001, 0.002]);
        expect(series[0].ys).toEqual([0, 0.9, 1.6]);
        expect(series[1].xs).toEqual([0, 1000, 2000]);
        expect(series[1].unit).toBe('K');
    });

    it('keeps every column when there is no stress-strain pair', () => {
        const section: ThermoSection = { section: 1, columns: ['Step', 'Temp', 'v_strain'], rows: [[0, 300, 0]] };

        expect(bentoSeries(section, 'metal').map((entry) => entry.key)).toEqual(['Temp', 'v_strain']);
    });
});

describe('bento layout', () => {
    it.each([
        [664, 4],
        [663, 2],
        [424, 2],
        [423, 1]
    ])('lays a %d px grid out in %d columns', (width, columns) => {
        expect(bentoColumns(bentoInnerWidth(width))).toBe(columns);
    });

    it('caps the featured tile at three columns', () => {
        expect([4, 2, 1].map(featuredSpan)).toEqual([3, 2, 1]);
    });

    it('spans the mockup tiles exactly per column count', () => {
        expect(bentoSpans(7, 4)).toEqual([1, 1, 1, 2, 1, 2, 2]);
        expect(bentoSpans(7, 2)).toEqual([1, 1, 1, 1, 2, 1, 1]);
        expect(bentoSpans(7, 1)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    });

    it('repeats the row pattern and fills the last row', () => {
        expect(bentoSpans(9, 4)).toEqual([1, 1, 1, 2, 1, 2, 2, 2, 2]);
        expect(bentoSpans(8, 4)).toEqual([1, 1, 1, 2, 1, 2, 2, 4]);
        expect(bentoSpans(4, 4)).toEqual([1, 1, 2, 2]);
        expect(bentoSpans(3, 2)).toEqual([1, 1, 2]);
    });

    it('adds the gaps a span crosses', () => {
        expect(tileWidth(676, 4, 1)).toBe(160);
        expect(tileWidth(676, 4, 3)).toBe(504);
    });
});

describe('formatValue', () => {
    it.each([
        [-63212.4, '-63,212'],
        [301.37, '301.4'],
        [4.618, '4.62'],
        [0, '0.00'],
        [0.07342, '0.0734']
    ])('formats %d as %s', (value, text) => {
        expect(formatValue(value)).toBe(text);
    });
});

describe('peakIndex', () => {
    it('finds the first maximum', () => {
        expect(peakIndex([1, 4, 2, 4])).toBe(1);
    });
});
