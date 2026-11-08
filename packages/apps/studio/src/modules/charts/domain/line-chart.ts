import type { ChartAnnotation, ChartDomain, PlotMode } from '@/modules/charts/domain/chart';
import type { YRange } from '@/modules/charts/domain/geometry';

export interface LineChartProps{
    xs: number[];
    ys: number[];
    width: number;
    height: number;
    bare: boolean;
    plotMode: PlotMode;
    xDomain: ChartDomain;
    xTicks: number[];
    yRange: YRange;
    areaBase: number | null;
    annotations: ChartAnnotation[];
    label: string;
    formatTick: (x: number) => string;
    formatX: (x: number) => string;
    formatY: (y: number) => string;
}
