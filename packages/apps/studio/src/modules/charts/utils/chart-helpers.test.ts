import { describe, expect, it } from 'vitest';
import { axisLabel } from '@/modules/charts/utils/axis-label';
import { compact } from '@/modules/charts/utils/compact';
import { niceTicks } from '@/modules/charts/utils/nice-ticks';
import { smoothSeries } from '@/modules/charts/utils/smooth-series';

describe('niceTicks', () => {
    it.each([
        [0, 4.62, 4, [0, 1, 2, 3, 4, 5], 1],
        [-3.56, -2.98, 4, [-3.6, -3.5, -3.4, -3.3, -3.2, -3.1, -3, -2.9], 0.1],
        [296, 331, 4, [290, 300, 310, 320, 330, 340], 10],
        [-63210, -62850, 4, [-63300, -63200, -63100, -63000, -62900, -62800], 100],
        [0, 500000, 5, [0, 100000, 200000, 300000, 400000, 500000], 100000]
    ])('scales %d..%d into round ticks', (lo, hi, count, ticks, step) => {
        const scale = niceTicks(lo, hi, count);

        expect(scale.ticks).toEqual(ticks);
        expect(scale.step).toBeCloseTo(step);
        expect(scale.lo).toBeCloseTo(ticks[0]);
        expect(scale.hi).toBeCloseTo(ticks[ticks.length - 1]);
    });

    it('widens a flat series by one either side', () => {
        expect(niceTicks(5, 5).ticks).toEqual([4, 4.5, 5, 5.5, 6]);
    });
});

describe('smoothSeries', () => {
    it('averages a centred window clipped at the ends', () => {
        expect(smoothSeries([0, 0, 6, 0, 0], 2)).toEqual([0, 2, 2, 2, 0]);
    });

    it('keeps a constant series constant', () => {
        expect(smoothSeries([3, 3, 3, 3])).toEqual([3, 3, 3, 3]);
    });

    it('uses a window of ten by default', () => {
        const values = Array.from({ length: 11 }, (_, i) => (i === 5 ? 11 : 0));

        const smoothed = smoothSeries(values);

        expect(smoothed[0]).toBeCloseTo(11 / 6);
        expect(smoothed[5]).toBeCloseTo(1);
        expect(smoothed[10]).toBeCloseTo(11 / 6);
    });
});

describe('axisLabel', () => {
    it.each([
        [-63200, 100, '-63.2k'],
        [20000, 10000, '20k'],
        [9000, 1000, '9000'],
        [0.25, 0.05, '0.25'],
        [-3.4, 0.2, '-3.4'],
        [300, 10, '300'],
        [0.00012, 0.00001, '0.0001']
    ])('labels %d at step %d as %s', (value, step, label) => {
        expect(axisLabel(value, step)).toBe(label);
    });
});

describe('compact', () => {
    it.each([
        [17784000, '18M'],
        [1152000, '1.2M'],
        [17784, '18k'],
        [-63210, '-63k'],
        [2000, '2k'],
        [1250, '1.3k'],
        [301.37, '301.4'],
        [0, '0'],
        [4.618, '4.6'],
        [0.0734, '0.073']
    ])('shortens %d to %s', (value, label) => {
        expect(compact(value)).toBe(label);
    });
});
