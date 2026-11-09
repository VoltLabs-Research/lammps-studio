import { FileEntry } from '@lammps-studio/contracts/file/domain';
import { RunProgress } from '@lammps-studio/contracts/run/domain';
import { ScriptFile } from '@lammps-studio/lammps/script/domain';
import { RESTART_EVERY } from './cu/cu-model';
import { CU_README, CU_SCRIPT } from './cu/cu-script';
import { progressSeconds, tensionSeconds } from './fake-cu-history';
import { CU_SIMULATION_ID, TENSION } from './fake-cu-run';
import { RunRecord, RUNS_DIR } from './fake-runs';
import { WATER_DATA_HEADER, WATER_README, WATER_SCRIPT, WATER_SETUP, WATER_SIMULATION_ID } from './fake-water';

export interface FakeFile{
    path: string;
    kind: string;
    sizeBytes: number;
    modifiedAt: string;
    text: string | null;
}

const MS_PER_SECOND = 1000;
const MINUTE_MS = 60 * MS_PER_SECOND;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MEGABYTE = 1e6;
const POTENTIAL_BYTES = 1.6 * MEGABYTE;
const DUMP_FRAME_BYTES = 1.07 * MEGABYTE;
const RESTART_BYTES = 1.7 * MEGABYTE;
const FINAL_DATA_BYTES = 1.2 * MEGABYTE;
const WATER_DATA_BYTES = 1.1 * MEGABYTE;
const CU_SCRIPT_EDITED_AGO = 6 * MINUTE_MS;
const CU_FOLDER_CREATED_AGO = 6 * DAY_MS;
const WATER_SCRIPT_EDITED_AGO = 163 * MINUTE_MS;
const WATER_FOLDER_CREATED_AGO = 1098 * MINUTE_MS;
const SEPARATOR = '/';
const FOLDER = 'Folder';

const textFile = (path: string, kind: string, modifiedAt: string, text: string): FakeFile => ({
    path,
    kind,
    sizeBytes: Buffer.byteLength(text),
    modifiedAt,
    text
});

const binaryFile = (path: string, kind: string, modifiedAt: string, sizeBytes: number): FakeFile => ({
    path,
    kind,
    sizeBytes: Math.round(sizeBytes),
    modifiedAt,
    text: null
});

export const seededFolders = (now: number): Map<string, FakeFile[]> => {
    const ago = (ms: number): string => new Date(now - ms).toISOString();

    return new Map([
        [CU_SIMULATION_ID, [
            binaryFile('potentials/Cu01.eam.alloy', 'EAM potential', ago(CU_FOLDER_CREATED_AGO), POTENTIAL_BYTES),
            textFile('main.in', 'LAMMPS input', ago(CU_SCRIPT_EDITED_AGO), CU_SCRIPT),
            textFile('README.md', 'Markdown', ago(CU_FOLDER_CREATED_AGO), CU_README)
        ]],
        [WATER_SIMULATION_ID, [
            textFile('water.lmp', 'LAMMPS input', ago(WATER_SCRIPT_EDITED_AGO), WATER_SCRIPT),
            textFile('setup.lammps', 'LAMMPS input', ago(WATER_SCRIPT_EDITED_AGO), WATER_SETUP),
            { ...binaryFile('tip4p.data', 'Data file', ago(WATER_FOLDER_CREATED_AGO), WATER_DATA_BYTES), text: WATER_DATA_HEADER },
            textFile('README.md', 'Markdown', ago(WATER_FOLDER_CREATED_AGO), WATER_README)
        ]]
    ]);
};

const restartSteps = ({ section, step }: RunProgress): number[] => {
    if(section !== TENSION) return [];

    return Array.from({ length: Math.floor(step / RESTART_EVERY) }, (_, index) => (index + 1) * RESTART_EVERY);
};

export const runFiles = ({ run, log, frames }: RunRecord): FakeFile[] => {
    if(log.length === 0) return [];

    const started = Date.parse(run.startedAt);
    const at = (seconds: number): string => new Date(started + seconds * MS_PER_SECOND).toISOString();
    const lastWrite = run.endedAt ?? at(progressSeconds(run.progress));
    const lastFrame = frames.at(-1);
    const files = [textFile(`${run.outputDir}/log.lammps`, 'LAMMPS log', lastWrite, `${log.map((line) => line.text).join('\n')}\n`)];

    if(lastFrame) files.push(binaryFile(`${run.outputDir}/wire.lammpstrj`, 'Dump, text', at(tensionSeconds(lastFrame.step)), frames.length * DUMP_FRAME_BYTES));
    for(const step of restartSteps(run.progress)){
        files.push(binaryFile(`${run.outputDir}/restart.${step}.cu`, 'Restart, binary', at(tensionSeconds(step)), RESTART_BYTES));
    }
    if(run.state === 'completed') files.push(binaryFile(`${run.outputDir}/final.data`, 'Data file', lastWrite, FINAL_DATA_BYTES));

    return files;
};

export const scriptFiles = (files: FakeFile[]): ScriptFile[] => files.flatMap(({ path, text }) => {
    if(text === null || isUnder(path, RUNS_DIR)) return [];

    return [{ path, text }];
});

export const folderPath = (path: string): string | null => {
    if(path.startsWith(SEPARATOR)) return null;

    const parts: string[] = [];
    for(const part of path.split(SEPARATOR)){
        if(part === '' || part === '.') continue;
        if(part !== '..'){
            parts.push(part);
            continue;
        }
        if(parts.length === 0) return null;
        parts.pop();
    }

    return parts.join(SEPARATOR);
};

export const isUnder = (path: string, dir: string): boolean => path === dir || path.startsWith(`${dir}${SEPARATOR}`);

const directoryEntry = (path: string, name: string, inside: FakeFile[]): FileEntry => ({
    name,
    path,
    directory: true,
    sizeBytes: null,
    items: new Set(inside.map((file) => file.path.slice(path.length + 1).split(SEPARATOR)[0])).size,
    modifiedAt: inside.reduce((latest, file) => (file.modifiedAt > latest ? file.modifiedAt : latest), inside[0].modifiedAt),
    kind: FOLDER
});

const fileEntry = (file: FakeFile, name: string): FileEntry => ({
    name,
    path: file.path,
    directory: false,
    sizeBytes: file.sizeBytes,
    items: null,
    modifiedAt: file.modifiedAt,
    kind: file.kind
});

const byFinderOrder = (a: FileEntry, b: FileEntry): number =>
    Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });

export const entriesIn = (files: FakeFile[], dir: string): FileEntry[] | null => {
    const prefix = dir === '' ? '' : `${dir}${SEPARATOR}`;
    const inside = files.filter((file) => file.path.startsWith(prefix));
    if(dir !== '' && inside.length === 0) return null;

    const names = [...new Set(inside.map((file) => file.path.slice(prefix.length).split(SEPARATOR)[0]))];
    const entries = names.map((name) => {
        const path = `${prefix}${name}`;
        const file = inside.find((candidate) => candidate.path === path);

        return file ? fileEntry(file, name) : directoryEntry(path, name, inside.filter((candidate) => isUnder(candidate.path, path)));
    });

    return entries.sort(byFinderOrder);
};
