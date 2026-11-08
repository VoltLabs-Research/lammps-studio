import type { ScriptVariable } from '@lammps-studio/contracts/script/domain';
import { isNumeric } from '../shared/text';

const OVERRIDABLE_STYLES = new Set(['index', 'loop']);
const FIRST_DEFINITION_WINS = new Set(['index', 'loop', 'world', 'universe', 'uloop', 'file', 'atomfile']);
const LIST_STYLES = new Set(['index', 'world', 'universe']);
const EXPRESSION_STYLES = new Set(['equal', 'internal']);
const LOOP_START = '1';

export interface VariableTable{
    definitions: Map<string, ScriptVariable>;
    values: Map<string, string>;
}

export const createVariableTable = (): VariableTable => ({
    definitions: new Map(),
    values: new Map()
});

const substitutionValue = (style: string, args: string[]): string | null => {
    if(LIST_STYLES.has(style)){
        return args[0] ?? null;
    }

    if(style === 'loop' || style === 'uloop'){
        return args.length > 1 && isNumeric(args[1]) ? args[0] : LOOP_START;
    }

    if(style === 'string'){
        return args.join(' ');
    }

    if(EXPRESSION_STYLES.has(style) && args.length === 1 && isNumeric(args[0])){
        return args[0];
    }

    return null;
};

export const defineVariable = (table: VariableTable, args: string[], line: number) => {
    const [name, style, ...rest] = args;
    if(name === undefined || style === undefined){
        return;
    }

    if(style === 'delete'){
        table.definitions.delete(name);
        table.values.delete(name);
        return;
    }

    if(table.definitions.has(name) && FIRST_DEFINITION_WINS.has(style)){
        return;
    }

    table.definitions.set(name, {
        name,
        style,
        value: rest.join(' '),
        line,
        overridable: OVERRIDABLE_STYLES.has(style)
    });

    const value = substitutionValue(style, rest);
    if(value === null){
        table.values.delete(name);
        return;
    }

    table.values.set(name, value);
};
