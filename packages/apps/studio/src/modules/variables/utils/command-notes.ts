import type { ScriptCommand, ScriptDump, ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { STRUCTURE_COLUMN } from '@/modules/viewport/utils/atom-palette';
import { formatInt } from '@/shared/utils/format';

const SCOPES: [string, string][] = [
    ['/atom', 'Per atom'],
    ['/chunk', 'Per chunk'],
    ['/local', 'Local']
];
const GLOBAL = 'Global';

const scopeOf = (style: string): string => SCOPES.find(([suffix]) => style.endsWith(suffix))?.[1] ?? GLOBAL;

const reads = (columns: string[], name: string): boolean => columns.some((column) => column === name || column.startsWith(`${name}[`));

export const computeStyle = (command: ScriptCommand): string => [command.style, command.args].filter(Boolean).join(' ');

export const computeNote = (compute: ScriptCommand, script: ScriptInfo, thermoColumns: string[]): string => {
    const name = `c_${compute.id}`;
    const notes = [scopeOf(compute.style)];
    const dumps = script.dumps.filter((dump) => reads(dump.columns, name));
    notes.push(...dumps.map((dump) => `in dump ${dump.id}`));
    if(reads(thermoColumns, name)) notes.push('in thermo');
    if(name === STRUCTURE_COLUMN && dumps.length > 0) notes.push('colors the viewport');

    return notes.join(' · ');
};

const activeRuns = (line: number, script: ScriptInfo): string | null => {
    const total = script.runs.length;
    const first = script.runs.findIndex((run) => run.line > line);
    if(first < 0) return null;
    if(first === 0 && total === 2) return 'active in both runs';
    if(first === 0 && total > 2) return 'active in all runs';
    if(first === total - 1) return `active in run ${total}`;

    return `active in runs ${first + 1}–${total}`;
};

export const fixNote = (fix: ScriptCommand, script: ScriptInfo): string => {
    const active = activeRuns(fix.line, script);
    if(active === null) return `Line ${fix.line}`;

    return `Line ${fix.line} · ${active}`;
};

export const dumpSummary = (dump: ScriptDump): string => `${dump.style} · every ${formatInt(dump.every)} step${dump.every === 1 ? '' : 's'}`;

export const dumpOutput = (dump: ScriptDump): string => [dump.file, dump.columns.join(' ')].filter(Boolean).join(' · ');
