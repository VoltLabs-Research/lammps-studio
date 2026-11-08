export interface LegendSwatch{
    name: string;
    color: string;
    count: number;
    share: number;
}

export interface StructureLegend{
    kind: 'structure';
    items: LegendSwatch[];
}

export interface TypeLegend{
    kind: 'type';
    items: LegendSwatch[];
}

export interface EnergyLegend{
    kind: 'energy';
    stops: string[];
    min: number;
    max: number;
    unit: string;
}

export type Legend = StructureLegend | TypeLegend | EnergyLegend;
