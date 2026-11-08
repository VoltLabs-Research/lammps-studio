import type { ChartGeometry, ChartMargin, GeometryInput, YRange } from '@/modules/charts/domain/geometry';
import { niceTicks } from '@/modules/charts/utils/nice-ticks';

const BARE_MARGIN: ChartMargin = {
    left: 2,
    right: 6,
    top: 6,
    bottom: 4
};

const AXIS_MARGIN: ChartMargin = {
    left: 40,
    right: 12,
    top: 10,
    bottom: 20
};

const PATH_DIGITS = 1;

const valueRange = (ys: number[], range: YRange): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;

    for(const y of ys){
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
    }
    if(range.pad !== null){
        lo -= range.pad;
        hi += range.pad;
    }
    if(range.min !== null){
        lo = Math.min(lo, range.min);
    }
    if(range.floor !== null){
        lo = Math.max(lo, range.floor);
    }

    return [lo, hi];
};

export const chartGeometry = (input: GeometryInput): ChartGeometry => {
    const margin = input.bare ? BARE_MARGIN : AXIS_MARGIN;
    const innerWidth = input.width - margin.left - margin.right;
    const innerHeight = input.height - margin.top - margin.bottom;
    const fill = input.bare && input.xs.length > 1;
    const x0 = fill ? input.xs[0] : input.xDomain.min;
    const x1 = fill ? input.xs[input.xs.length - 1] : input.xDomain.max;
    const [lo, hi] = valueRange(input.ys, input.yRange);
    const scale = niceTicks(lo, hi, input.yRange.ticks);

    return {
        margin,
        x0,
        x1,
        scale,
        sx: (x) => margin.left + ((x - x0) / (x1 - x0)) * innerWidth,
        sy: (y) => margin.top + innerHeight - ((y - scale.lo) / (scale.hi - scale.lo)) * innerHeight
    };
};

export const linePath = (geometry: ChartGeometry, xs: number[], ys: number[]): string => {
    let path = '';

    for(let i = 0; i < ys.length; i++){
        path += `${i ? 'L' : 'M'}${geometry.sx(xs[i]).toFixed(PATH_DIGITS)},${geometry.sy(ys[i]).toFixed(PATH_DIGITS)}`;
    }

    return path;
};

export const areaPath = (geometry: ChartGeometry, xs: number[], ys: number[], base: number): string => {
    const { scale, sx, sy } = geometry;
    const floor = sy(Math.max(scale.lo, Math.min(scale.hi, base))).toFixed(PATH_DIGITS);
    const first = sx(xs[0]).toFixed(PATH_DIGITS);
    const last = sx(xs[xs.length - 1]).toFixed(PATH_DIGITS);

    return `${linePath(geometry, xs, ys)}L${last},${floor}L${first},${floor}Z`;
};

export const nearestIndex = (geometry: ChartGeometry, xs: number[], px: number): number => {
    let best = 0;
    let distance = Infinity;

    for(let i = 0; i < xs.length; i++){
        const gap = Math.abs(geometry.sx(xs[i]) - px);

        if(gap < distance){
            distance = gap;
            best = i;
        }
    }

    return best;
};
