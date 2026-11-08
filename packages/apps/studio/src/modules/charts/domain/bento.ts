import type { ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { UnitStyle } from '@lammps-studio/contracts/script/domain';
import type { BentoSeries, PlotMode } from '@/modules/charts/domain/chart';

export interface ChartsBentoProps{
    sections: ThermoSection[];
    units: UnitStyle;
    plotMode: PlotMode;
    totalSteps: number | null;
    featured: string | null;
    onFeature: (key: string) => void;
}

export interface ChartSizing{
    width: number;
    height: number;
    big: boolean;
    plotMode: PlotMode;
    totalSteps: number | null;
}

export interface SeriesPeak{
    label: string;
    value: string;
    unit: string;
    note: string;
}

export interface TileProps{
    series: BentoSeries;
    steps: number[];
    span: number;
    sizing: ChartSizing;
    onFeature: (key: string) => void;
}

export interface FeaturedTileProps{
    series: BentoSeries;
    steps: number[];
    span: number;
    sizing: ChartSizing;
}

export interface StatTileProps{
    peak: SeriesPeak;
    span: number;
}

export interface TileHeadProps{
    label: string;
    value: string;
    unit: string;
}

export interface BentoChartItem{
    kind: 'chart';
    series: BentoSeries;
}

export interface BentoStatItem{
    kind: 'stat';
    series: BentoSeries;
}

export type BentoItem = BentoChartItem | BentoStatItem;
