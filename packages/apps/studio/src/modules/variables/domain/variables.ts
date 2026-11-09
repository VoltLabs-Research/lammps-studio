export type VariablesTab = 'variables' | 'computes' | 'fixes' | 'dumps';

export interface VariableRow{
    name: string;
    style: string;
    current: string;
    override: string;
    editable: boolean;
}

export interface TabOption{
    value: VariablesTab;
    label: string;
}

export interface ThermoCompute{
    id: string;
    group: string;
    style: string;
    column: string;
}
