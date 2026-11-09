import type { Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { ScriptInfo, ScriptVariable } from '@lammps-studio/contracts/script/domain';
import { isNumeric } from '@lammps-studio/lammps/shared/text';
import type { VariableRow, VariablesTab } from '@/modules/variables/domain/variables';

const NO_VALUE = '—';
const LIVE_DIGITS = 4;
const FORMULA_STYLES = ['equal', 'vector', 'atom'];

const liveValue = (name: string, thermo: ThermoSection[]): number | null => {
    const section = thermo.at(-1);
    const column = section?.columns.indexOf(`v_${name}`) ?? -1;
    const row = section?.rows.at(-1);
    if(column < 0 || !row) return null;

    return row[column];
};

const currentValue = (variable: ScriptVariable, run: Run | null, thermo: ThermoSection[]): string => {
    const live = liveValue(variable.name, thermo);
    if(live !== null) return live.toFixed(LIVE_DIGITS);

    const used = run?.config.variables[variable.name];
    if(used !== undefined) return used;
    if(FORMULA_STYLES.includes(variable.style) && !isNumeric(variable.value)) return NO_VALUE;

    return variable.value;
};

export const variableRows = (script: ScriptInfo, run: Run | null, thermo: ThermoSection[], overrides: Record<string, string> | null): VariableRow[] => {
    return script.variables.map((variable) => ({
        name: variable.name,
        style: variable.style,
        current: currentValue(variable, run, thermo),
        override: overrides?.[variable.name] ?? '',
        editable: variable.overridable
    }));
};

export const variablesSub = (entry: string, runNumber: number | null): string => {
    if(runNumber === null) return entry;

    return `${entry} · run ${runNumber}`;
};

export const thermoColumnsOf =(thermo: ThermoSection[]): string[] => [...new Set(thermo.flatMap((section) => section.columns))];

export const isTabEmpty = (script: ScriptInfo, tab: VariablesTab): boolean => {
    if(tab === 'computes') return false;

    return script[tab].length === 0;
};
