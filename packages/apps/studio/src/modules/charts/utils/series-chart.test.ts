import { describe, expect, it } from 'vitest';
import type { BentoSeries } from '@/modules/charts/domain/chart';
import { seriesChart, seriesPeak } from '@/modules/charts/utils/series-chart';

const STEPS = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000];

const STRESS: BentoSeries = {
    key: 'stress-strain',
    label: 'Stress–strain',
    unit: 'GPa',
    axis: 'strain',
    xs: STEPS.map((step) => step * 1e-6),
    ys: [0, 2, 4.6, 3, 2, 1.5, 1.4, 1.3]
};

const TEMP: BentoSeries = {
    key: 'Temp',
    label: 'Temperature',
    unit: 'K',
    axis: 'step',
    xs: STEPS,
    ys: [300, 301, 299, 305, 302, 300, 301, 300]
};

const SIZING = {
    width: 400,
    height: 200,
    big: true,
    plotMode: 'both' as const,
    totalSteps: 14000
};

describe('seriesChart', () => {
    it('extends the step axis to the planned run length', () => {
        const chart = seriesChart(TEMP, STEPS, SIZING);

        expect(chart.xDomain).toEqual({ min: 0, max: 14000 });
        expect(chart.xTicks).toEqual([0, 2000, 4000, 6000, 8000, 10000, 12000, 14000]);
        expect(chart.formatX(2000)).toBe('Step 2,000');
        expect(chart.formatY(301.37)).toBe('301.4 K');
    });

    it('projects the strain axis to where the run ends and marks the yield', () => {
        const chart = seriesChart(STRESS, STEPS, SIZING);

        expect(chart.xDomain.max).toBeCloseTo(0.014);
        expect(chart.yRange.floor).toBe(0);
        expect(chart.annotations).toEqual([{ x: 0.002, y: 4.6, label: 'Yield 4.60 GPa' }]);
    });

    it('leaves sparklines bare and unannotated', () => {
        const chart = seriesChart(STRESS, STEPS, { ...SIZING, big: false });

        expect(chart.bare).toBe(true);
        expect(chart.annotations).toEqual([]);
    });
});

describe('seriesPeak', () => {
    it('reports the yield strength once stress has dropped past the peak', () => {
        expect(seriesPeak(STRESS)).toEqual({ label: 'Yield strength', value: '4.60', unit: 'GPa', note: 'at strain 0.002' });
    });

    it('calls it the peak so far while stress still rises', () => {
        expect(seriesPeak({ ...STRESS, ys: [0, 1, 2, 3, 4, 5, 6, 7] }).label).toBe('Peak stress so far');
    });

    it('reports the step of the peak for other series', () => {
        expect(seriesPeak(TEMP)).toEqual({ label: 'Peak temperature', value: '305.0', unit: 'K', note: 'at step 3,000' });
    });
});
