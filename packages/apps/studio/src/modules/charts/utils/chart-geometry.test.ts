import { describe, expect, it } from 'vitest';
import { areaPath, chartGeometry, linePath, nearestIndex } from '@/modules/charts/utils/chart-geometry';

const RANGE = {
    pad: null,
    min: null,
    floor: null,
    ticks: 4
};

const geometry = (bare: boolean) => chartGeometry({
    xs: [0, 5, 10],
    ys: [0, 2, 4],
    width: 152,
    height: 130,
    bare,
    xDomain: { min: 0, max: 20 },
    yRange: RANGE
});

describe('chartGeometry', () => {
    it('maps the domain into the plot inside the axis margins', () => {
        const g = geometry(false);

        expect(g.sx(0)).toBe(40);
        expect(g.sx(20)).toBe(140);
        expect(g.sy(g.scale.lo)).toBe(110);
        expect(g.sy(g.scale.hi)).toBe(10);
    });

    it('lets a sparkline fill its tile from the first to the last x', () => {
        const g = geometry(true);

        expect(g.sx(0)).toBe(2);
        expect(g.sx(10)).toBe(146);
    });

    it('floors the value range when asked', () => {
        const g = chartGeometry({
            xs: [0, 1],
            ys: [0.1, 4.6],
            width: 100,
            height: 100,
            bare: false,
            xDomain: { min: 0, max: 1 },
            yRange: { pad: 0.2, min: 0, floor: 0, ticks: 4 }
        });

        expect(g.scale.lo).toBe(0);
    });
});

describe('paths', () => {
    it('draws a polyline and closes the area on its base', () => {
        const g = geometry(true);

        expect(linePath(g, [0, 10], [0, 4])).toBe(`M2.0,${g.sy(0).toFixed(1)}L146.0,${g.sy(4).toFixed(1)}`);
        expect(areaPath(g, [0, 10], [0, 4], 0).endsWith(`L146.0,${g.sy(0).toFixed(1)}L2.0,${g.sy(0).toFixed(1)}Z`)).toBe(true);
    });

    it('picks the sample closest to the pointer', () => {
        const g = geometry(true);

        expect(nearestIndex(g, [0, 5, 10], g.sx(6))).toBe(1);
        expect(nearestIndex(g, [0, 5, 10], g.sx(9))).toBe(2);
    });
});
