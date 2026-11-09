export type ThermoFormat = 'csv' | 'dat' | 'yaml' | 'png';

export interface ExportOption{
    format: ThermoFormat;
    label: string;
}
