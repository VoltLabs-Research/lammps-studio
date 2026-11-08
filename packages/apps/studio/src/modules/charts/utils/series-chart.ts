import type { ChartSizing, SeriesPeak } from '@/modules/charts/domain/bento';
import type { BentoSeries, ChartAnnotation, ChartDomain } from '@/modules/charts/domain/chart';
import type { LineChartProps } from '@/modules/charts/domain/line-chart';
import { axisLabel } from '@/modules/charts/utils/axis-label';
import { compact } from '@/modules/charts/utils/compact';
import { formatValue } from '@/modules/charts/utils/format-value';
import { niceTicks } from '@/modules/charts/utils/nice-ticks';
import { peakIndex } from '@/modules/charts/utils/peak-index';

const X_TICKS = 5;
const Y_TICKS = 4;
const STRESS_PAD_SHARE = 0.04;
const ROWS_PAST_YIELD = 4;
const STRAIN_DIGITS = 3;
const STRESS_DIGITS = 2;

const withUnit = (text: string, unit: string): string => {
    return unit ? `${text} ${unit}` : text;
};

const projectedEnd = (series: BentoSeries, steps: number[], totalSteps: number | null): number => {
    const last = series.xs[series.xs.length - 1];

    if(totalSteps === null || steps.length < 2 || series.axis === 'step'){
        return totalSteps ?? last;
    }

    const covered = steps[steps.length - 1] - steps[0];

    return covered > 0 ? series.xs[0] + (last - series.xs[0]) * ((totalSteps - steps[0]) / covered) : last;
};

const xAxis = (series: BentoSeries, end: number): ChartDomain => {
    return {
        min: series.axis === 'strain' ? 0 : series.xs[0],
        max: Math.max(end, series.xs[series.xs.length - 1])
    };
};

export const hasYielded = (series: BentoSeries): boolean => {
    return peakIndex(series.ys) < series.ys.length - ROWS_PAST_YIELD;
};

export const seriesValue = (series: BentoSeries): string => {
    const last = series.ys[series.ys.length - 1];

    return series.axis === 'strain' ? last.toFixed(STRESS_DIGITS) : formatValue(last);
};

const yieldAnnotation = (series: BentoSeries, big: boolean): ChartAnnotation[] => {
    if(!big || series.axis !== 'strain' || !hasYielded(series)){
        return [];
    }

    const peak = peakIndex(series.ys);

    return [{
        x: series.xs[peak],
        y: series.ys[peak],
        label: withUnit(`Yield ${series.ys[peak].toFixed(STRESS_DIGITS)}`, series.unit)
    }];
};

export const seriesChart = (series: BentoSeries, steps: number[], sizing: ChartSizing): LineChartProps => {
    const strain = series.axis === 'strain';
    const domain = xAxis(series, projectedEnd(series, steps, sizing.totalSteps));
    const ticks = niceTicks(domain.min, domain.max, X_TICKS);
    const span = Math.max(...series.ys) - Math.min(...series.ys);

    return {
        xs: series.xs,
        ys: series.ys,
        width: sizing.width,
        height: sizing.height,
        bare: !sizing.big,
        plotMode: sizing.plotMode,
        xDomain: domain,
        xTicks: ticks.ticks.filter((tick) => tick >= domain.min && tick <= domain.max),
        yRange: {
            pad: strain ? span * STRESS_PAD_SHARE : 0,
            min: strain ? 0 : null,
            floor: strain ? 0 : null,
            ticks: Y_TICKS
        },
        areaBase: strain ? 0 : null,
        annotations: yieldAnnotation(series, sizing.big),
        label: strain ? 'Stress against strain' : `${series.label} against step`,
        formatTick: strain ? (tick) => axisLabel(tick, ticks.step) : compact,
        formatX: strain ? (x) => `ε ${x.toFixed(STRAIN_DIGITS)}` : (x) => `Step ${Math.round(x).toLocaleString('en-US')}`,
        formatY: (y) => withUnit(strain ? y.toFixed(STRESS_DIGITS) : formatValue(y), series.unit)
    };
};

export const seriesPeak = (series: BentoSeries): SeriesPeak => {
    const peak = peakIndex(series.ys);

    if(series.axis === 'strain'){
        return {
            label: hasYielded(series) ? 'Yield strength' : 'Peak stress so far',
            value: series.ys[peak].toFixed(STRESS_DIGITS),
            unit: series.unit,
            note: `at strain ${series.xs[peak].toFixed(STRAIN_DIGITS)}`
        };
    }

    return {
        label: `Peak ${series.label.charAt(0).toLowerCase()}${series.label.slice(1)}`,
        value: formatValue(series.ys[peak]),
        unit: series.unit,
        note: `at step ${Math.round(series.xs[peak]).toLocaleString('en-US')}`
    };
};
