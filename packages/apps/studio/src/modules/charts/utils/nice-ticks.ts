import type { TickScale } from '@/modules/charts/domain/ticks';

const DEFAULT_TICKS = 4;
const TICK_PRECISION = 12;
const STEP_TEN_FROM = 7.5;
const STEP_FIVE_FROM = 3.5;
const STEP_TWO_FROM = 1.5;

const roundStep = (rough: number): number => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const ratio = rough / magnitude;

    if(ratio >= STEP_TEN_FROM){
        return 10 * magnitude;
    }
    if(ratio >= STEP_FIVE_FROM){
        return 5 * magnitude;
    }
    if(ratio >= STEP_TWO_FROM){
        return 2 * magnitude;
    }

    return magnitude;
};

export const niceTicks = (min: number, max: number, count = DEFAULT_TICKS): TickScale => {
    const lo = min === max ? min - 1 : min;
    const hi = min === max ? max + 1 : max;
    const step = roundStep((hi - lo) / count);
    const first = Math.floor(lo / step) * step;
    const last = Math.ceil(hi / step) * step;
    const ticks: number[] = [];

    for(let tick = first; tick <= last + step * 0.5; tick += step){
        ticks.push(Number(tick.toPrecision(TICK_PRECISION)));
    }

    return {
        ticks,
        lo: first,
        hi: last,
        step
    };
};
