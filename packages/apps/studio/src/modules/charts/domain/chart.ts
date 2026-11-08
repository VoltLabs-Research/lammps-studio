export type PlotMode = 'raw' | 'smooth' | 'both';

export type UnitStyle = 'metal' | 'real' | 'lj' | 'si' | 'cgs' | 'electron' | 'micro' | 'nano';

export type SeriesAxis = 'step' | 'strain';

export interface ChartDomain{
    min: number;
    max: number;
}

export interface ChartAnnotation{
    x: number;
    y: number;
    label: string;
}

export interface ThermoQuantity{
    label: string;
    unit: string;
}

export interface BentoSeries{
    key: string;
    label: string;
    unit: string;
    axis: SeriesAxis;
    xs: number[];
    ys: number[];
}

export interface StressStrainColumns{
    strain: string;
    stress: string;
}
