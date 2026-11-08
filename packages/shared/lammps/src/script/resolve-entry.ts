import type { EntryCandidate } from '@lammps-studio/contracts/script/domain';
import { baseName, depthOf, normalizePath } from '../shared/paths';
import { splitLines } from '../shared/text';
import { ScriptFile } from './domain';
import { readStatements, splitWords } from './read-statements';

const MAIN_ENTRY = 'main.in';
const INPUT_NAME = /(?:\.in$|^in\.)/;
const SCRIPT_NAME = /\.(?:lmp|lammps|lam|inp)$/;
const DATA_ATOMS = /^\s*(\d+)\s+atoms\s*$/;
const DATA_HEADER_LINES = 40;
const SCRIPT_MIN_COMMANDS = 2;
const RUN_COMMANDS = new Set(['run', 'minimize', 'rerun', 'neb', 'prd', 'tad', 'temper']);

const LAMMPS_COMMANDS = new Set([
    'units', 'atom_style', 'boundary', 'dimension', 'lattice', 'region', 'create_box', 'create_atoms',
    'read_data', 'read_restart', 'pair_style', 'pair_coeff', 'mass', 'velocity', 'fix', 'compute',
    'thermo', 'thermo_style', 'dump', 'run', 'minimize', 'timestep', 'neighbor', 'neigh_modify',
    'variable', 'include', 'kspace_style', 'bond_style', 'angle_style', 'group', 'write_data', 'reset_timestep'
]);

type FileKind = 'script' | 'data' | 'text';

interface ClassifiedFile{
    path: string;
    lines: number;
    kind: FileKind;
    commands: string[][];
    atoms: number | null;
}

const dataAtoms = (text: string): number | null => {
    const header = splitLines(text).slice(0, DATA_HEADER_LINES);
    const match = header.map((line) => DATA_ATOMS.exec(line)).find((found) => found !== null);

    return match ? Number(match[1]) : null;
};

const kindOf = (path: string, commands: string[][], atoms: number | null): FileKind => {
    if(atoms !== null){
        return 'data';
    }

    const named = INPUT_NAME.test(baseName(path)) || SCRIPT_NAME.test(path);
    const known = commands.filter(([command]) => LAMMPS_COMMANDS.has(command)).length;

    return named || known >= SCRIPT_MIN_COMMANDS ? 'script' : 'text';
};

const classify = (file: ScriptFile): ClassifiedFile => {
    const path = normalizePath(file.path);
    const commands = readStatements(file.text).map((statement) => splitWords(statement.text));
    const atoms = dataAtoms(file.text);

    return {
        path,
        lines: splitLines(file.text).length,
        kind: kindOf(path, commands, atoms),
        commands,
        atoms
    };
};

const includesOf = (files: ClassifiedFile[]): Map<string, string> => {
    const parents = new Map<string, string>();

    for(const file of files.filter((entry) => entry.kind === 'script')){
        for(const [command, target] of file.commands){
            if(command === 'include' && target !== undefined && !parents.has(normalizePath(target))){
                parents.set(normalizePath(target), file.path);
            }
        }
    }

    return parents;
};

const hasRun = (file: ClassifiedFile): boolean => {
    return file.commands.some(([command]) => RUN_COMMANDS.has(command));
};

const rankOf = (file: ClassifiedFile, includedBy: string | undefined): number => {
    if(file.path === MAIN_ENTRY) return 0;
    if(file.kind === 'script' && INPUT_NAME.test(baseName(file.path)) && includedBy === undefined) return 1;
    if(file.kind === 'script' && hasRun(file) && includedBy === undefined) return 2;
    if(file.kind === 'script') return 3;
    if(file.kind === 'data') return 4;

    return 5;
};

const hintOf = (file: ClassifiedFile, includedBy: string | undefined): string => {
    if(file.kind === 'data'){
        return file.atoms === null ? 'data file' : `data file · ${file.atoms.toLocaleString('en-US')} atoms`;
    }

    if(file.kind === 'text'){
        return 'text';
    }

    if(includedBy !== undefined){
        return `${file.lines} lines · included by ${baseName(includedBy)}`;
    }

    return hasRun(file) ? `${file.lines} lines · has a run command` : `${file.lines} lines`;
};

const LIKELY_RANK = 2;

export const resolveEntry = (files: ScriptFile[]): EntryCandidate[] => {
    const classified = files.map(classify);
    const parents = includesOf(classified);
    const ranked = classified
        .map((file) => ({ file, includedBy: parents.get(file.path), rank: rankOf(file, parents.get(file.path)) }))
        .sort((a, b) => a.rank - b.rank || depthOf(a.file.path) - depthOf(b.file.path) || a.file.path.localeCompare(b.file.path));

    return ranked.map(({ file, includedBy, rank }, index) => ({
        path: file.path,
        lines: file.lines,
        hint: hintOf(file, includedBy),
        likely: index === 0 && rank <= LIKELY_RANK
    }));
};
