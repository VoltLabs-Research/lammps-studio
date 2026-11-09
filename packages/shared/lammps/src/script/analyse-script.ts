import type { RequiredPackage, ScriptCommand, ScriptDump, ScriptInfo, ScriptRun, UnitStyle } from '@lammps-studio/contracts/script/domain';
import { isNumeric, splitLines } from '../shared/text';
import { normalizePath } from '../shared/paths';
import { ScriptFile } from './domain';
import { StyleCommand, SUFFIX_PACKAGES } from './package-rules';
import { packagesForStyle } from './packages-for-style';
import { readStatements, splitWords, substitute } from './read-statements';
import { createVariableTable, defineVariable, VariableTable } from './variables';

const STYLE_COMMANDS = new Set<string>([
    'pair_style',
    'bond_style',
    'angle_style',
    'dihedral_style',
    'improper_style',
    'kspace_style',
    'atom_style',
    'run_style'
]);

const IMPLIED_DUMP_COLUMNS: Record<string, string[]> = {
    atom: ['id', 'type', 'xs', 'ys', 'zs'],
    xyz: ['type', 'x', 'y', 'z']
};

const LISTED_DUMP_STYLES = new Set(['custom', 'cfg', 'local', 'netcdf', 'h5md']);
const DUMP_STYLE_VARIANT = /\/(?:gz|zstd|mpiio|adios)$/;
const INTEGER = /^\d+$/;
const WHITESPACE = /\s+/;
const UNIT_STYLES: readonly UnitStyle[] = ['lj', 'real', 'metal', 'si', 'cgs', 'electron', 'micro', 'nano'];

interface ScriptState{
    files: Map<string, string>;
    overrides: Map<string, string>;
    visited: Set<string>;
    variables: VariableTable;
    computes: ScriptCommand[];
    fixes: ScriptCommand[];
    dumps: ScriptDump[];
    runs: ScriptRun[];
    packages: Map<string, RequiredPackage>;
    thermoEvery: number | null;
    units: UnitStyle;
}

type CommandHandler = (state: ScriptState, args: string[], line: number) => void;

const overrideValues = (overrides: Record<string, string>): Map<string, string> => {
    const values = Object.entries(overrides)
        .map(([name, value]): [string, string] => [name, value.trim().split(WHITESPACE)[0]])
        .filter(([, value]) => value !== '');

    return new Map(values);
};

const isStyleCommand = (word: string): word is StyleCommand => STYLE_COMMANDS.has(word);

const integerOf = (word: string | undefined): number | null => {
    if(word === undefined || !INTEGER.test(word)){
        return null;
    }

    return Number(word);
};

const requireFor = (state: ScriptState, command: StyleCommand, style: string, line: number) => {
    const reason = command === 'command' ? style : `${command} ${style}`;

    for(const name of packagesForStyle(command, style)){
        if(!state.packages.has(name)){
            state.packages.set(name, { name, reason, line });
        }
    }
};

const requireStyle = (state: ScriptState, command: StyleCommand, args: string[], line: number) => {
    const [style, ...rest] = args;
    if(style === undefined){
        return;
    }

    requireFor(state, command, style, line);

    if(style.startsWith('hybrid')){
        rest.filter((word) => !isNumeric(word)).forEach((substyle) => requireFor(state, command, substyle, line));
    }
};

const toCommand = (args: string[], line: number): ScriptCommand | null => {
    const [id, group, style, ...rest] = args;
    if(id === undefined || group === undefined || style === undefined){
        return null;
    }

    return { id, group, style, args: rest.join(' '), line };
};

const dumpColumns = (style: string, rest: string[]): string[] => {
    const base = style.replace(DUMP_STYLE_VARIANT, '');
    if(LISTED_DUMP_STYLES.has(base)){
        return rest;
    }

    return IMPLIED_DUMP_COLUMNS[base] ?? [];
};

const handleDump: CommandHandler = (state, args, line) => {
    const [id, group, style, every, file, ...rest] = args;
    const interval = integerOf(every);
    if(id === undefined || group === undefined || style === undefined || file === undefined || interval === null){
        return;
    }

    state.dumps.push({ id, group, style, every: interval, file, columns: dumpColumns(style, rest), line });
    requireFor(state, 'dump', style, line);
};

const handleFixOrCompute = (kind: 'fix' | 'compute', list: (state: ScriptState) => ScriptCommand[]): CommandHandler => {
    return (state, args, line) => {
        const command = toCommand(args, line);
        if(!command){
            return;
        }

        list(state).push(command);
        requireFor(state, kind, command.style, line);
    };
};

const handleRun: CommandHandler = (state, args, line) => {
    const steps = integerOf(args[0]);
    if(steps !== null){
        state.runs.push({ line, steps });
    }
};

const handleThermo: CommandHandler = (state, args) => {
    state.thermoEvery = integerOf(args[0]) ?? state.thermoEvery;
};

const handleUnits: CommandHandler = (state, args) => {
    state.units = UNIT_STYLES.find((style) => style === args[0]) ?? state.units;
};

const handleAccelerator: CommandHandler = (state, args, line) => {
    const name = SUFFIX_PACKAGES[args[0] ?? ''];
    if(name !== undefined && !state.packages.has(name)){
        state.packages.set(name, { name, reason: `suffix ${args[0]}`, line });
    }
};

const HANDLERS: Record<string, CommandHandler> = {
    variable: (state, args, line) => defineVariable(state.variables, args, line),
    compute: handleFixOrCompute('compute', (state) => state.computes),
    fix: handleFixOrCompute('fix', (state) => state.fixes),
    dump: handleDump,
    run: handleRun,
    thermo: handleThermo,
    units: handleUnits,
    package: handleAccelerator,
    suffix: handleAccelerator,
    include: (state, args, line) => walk(state, normalizePath(args[0] ?? ''), line)
};

const handle = (state: ScriptState, words: string[], line: number) => {
    const [command, ...args] = words;
    const handler = HANDLERS[command];

    if(handler){
        handler(state, args, line);
        return;
    }

    if(isStyleCommand(command)){
        requireStyle(state, command, args, line);
        return;
    }

    requireFor(state, 'command', command, line);
};

function walk(state: ScriptState, path: string, includeLine: number | null){
    const text = state.files.get(path);
    if(text === undefined || state.visited.has(path)){
        return;
    }

    state.visited.add(path);
    const lookup = (name: string) => state.overrides.get(name) ?? state.variables.values.get(name) ?? null;

    for(const statement of readStatements(text)){
        const words = splitWords(substitute(statement.text, lookup));
        if(words.length > 0){
            handle(state, words, includeLine ?? statement.line);
        }
    }
}

export const analyseScript = (entry: string, files: ScriptFile[], overrides: Record<string, string> = {}): ScriptInfo => {
    const path = normalizePath(entry);
    const state: ScriptState = {
        files: new Map(files.map((file) => [normalizePath(file.path), file.text])),
        overrides: overrideValues(overrides),
        visited: new Set(),
        variables: createVariableTable(),
        computes: [],
        fixes: [],
        dumps: [],
        runs: [],
        packages: new Map(),
        thermoEvery: null,
        units: 'lj'
    };

    walk(state, path, null);

    return {
        entry: path,
        lines: splitLines(state.files.get(path) ?? '').length,
        variables: [...state.variables.definitions.values()],
        computes: state.computes,
        fixes: state.fixes,
        dumps: state.dumps,
        runs: state.runs,
        requiredPackages: [...state.packages.values()],
        thermoEvery: state.thermoEvery,
        units: state.units
    };
};
