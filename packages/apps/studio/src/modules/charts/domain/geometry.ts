import type { ChartDomain } from '@/modules/charts/domain/chart';
import type { TickScale } from '@/modules/charts/domain/ticks';

export interface ChartMargin{
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface YRange{
    pad: number | null;
    min: number | null;
    floor: number | null;
    ticks: number;
}

export interface GeometryInput{
    xs: number[];
    ys: number[];
    width: number;
    height: number;
    bare: boolean;
    xDomain: ChartDomain;
    yRange: YRange;
}

export interface ChartGeometry{
    margin: ChartMargin;
    x0: number;
    x1: number;
    scale: TickScale;
    sx: (x: number) => number;
    sy: (y: number) => number;
}
