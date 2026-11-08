import type { Frame, FrameBox } from '@lammps-studio/contracts/run/frame';
import { DumpErrors } from '../shared/errors';
import { isNumeric, splitLines, splitTokens } from '../shared/text';
import { BoxGeometry, readBox } from './box';
import LineCursor from './LineCursor';

const ITEM = 'ITEM: ';
const SKIPPED_COLUMNS = new Set(['id']);
const XYZ_TIMESTEP = /Timestep:\s*(-?\d+)/;
const XYZ_COLUMNS = ['type', 'x', 'y', 'z'];

interface PositionSet{
    names: [string, string, string];
    scaled: boolean;
}

const POSITION_SETS: PositionSet[] = [
    { names: ['x', 'y', 'z'], scaled: false },
    { names: ['xu', 'yu', 'zu'], scaled: false },
    { names: ['xs', 'ys', 'zs'], scaled: true },
    { names: ['xsu', 'ysu', 'zsu'], scaled: true }
];

interface AtomTable{
    names: string[];
    atoms: number;
    positions: Float32Array;
    columns: Record<string, Float32Array>;
}

interface FrameItems{
    step: number | null;
    atoms: number | null;
    box: BoxGeometry | null;
}

const integerOf = (text: string, what: string): number => {
    const value = Number(text.trim());
    if(!Number.isInteger(value)){
        throw DumpErrors.Malformed(`${what} is not an integer: ${text}`);
    }

    return value;
};

const symbolIndex = (symbols: Map<string, number>, token: string): number => {
    const known = symbols.get(token);
    if(known !== undefined){
        return known;
    }

    symbols.set(token, symbols.size + 1);
    return symbols.size;
};

const readAtomTable = (cursor: LineCursor, names: string[], atoms: number, set: PositionSet): AtomTable => {
    const axes = set.names.map((name) => names.indexOf(name));
    const valueNames = names.filter((name) => !set.names.includes(name) && !SKIPPED_COLUMNS.has(name));
    const valueIndexes = valueNames.map((name) => names.indexOf(name));
    const positions = new Float32Array(atoms * 3);
    const columns = Object.fromEntries(valueNames.map((name) => [name, new Float32Array(atoms)]));
    const symbols = valueNames.map(() => new Map<string, number>());

    for(let atom = 0; atom < atoms; atom++){
        const tokens = splitTokens(cursor.next());
        if(tokens.length !== names.length){
            throw DumpErrors.Malformed(`atom line ${cursor.line} has ${tokens.length} values for ${names.length} columns`);
        }

        axes.forEach((column, axis) => {
            positions[atom * 3 + axis] = Number(tokens[column]);
        });
        valueIndexes.forEach((column, index) => {
            const token = tokens[column];
            columns[valueNames[index]][atom] = isNumeric(token) ? Number(token) : symbolIndex(symbols[index], token);
        });
    }

    return { names: valueNames, atoms, positions, columns };
};

const unscale = (positions: Float32Array, box: BoxGeometry) => {
    const [lx, ly, lz] = [0, 1, 2].map((axis) => box.high[axis] - box.low[axis]);
    const [xy, xz, yz] = box.tilt;

    for(let atom = 0; atom < positions.length; atom += 3){
        const [xs, ys, zs] = [positions[atom], positions[atom + 1], positions[atom + 2]];
        positions[atom] = box.low[0] + xs * lx + ys * xy + zs * xz;
        positions[atom + 1] = box.low[1] + ys * ly + zs * yz;
        positions[atom + 2] = box.low[2] + zs * lz;
    }
};

const toFrame = (step: number, table: AtomTable, box: FrameBox): Frame => {
    return {
        header: {
            step,
            atoms: table.atoms,
            box,
            columns: table.names
        },
        positions: table.positions,
        columns: table.columns
    };
};

const readAtomsItem = (cursor: LineCursor, item: string, items: FrameItems): Frame => {
    const { step, atoms, box } = items;
    if(step === null || atoms === null || box === null){
        throw DumpErrors.Malformed(`ATOMS before TIMESTEP, NUMBER OF ATOMS or BOX BOUNDS at line ${cursor.line}`);
    }

    const names = splitTokens(item).slice(1);
    const set = POSITION_SETS.find((candidate) => candidate.names.every((name) => names.includes(name)));
    if(!set){
        throw DumpErrors.Malformed(`no x y z columns in ${item}`);
    }

    const table = readAtomTable(cursor, names, atoms, set);
    if(set.scaled){
        unscale(table.positions, box);
    }

    return toFrame(step, table, box.bounds);
};

const readLammpsFrame = (cursor: LineCursor): Frame => {
    const items: FrameItems = {
        step: null,
        atoms: null,
        box: null
    };

    while(!cursor.done()){
        const line = cursor.next();
        if(!line.startsWith(ITEM)){
            throw DumpErrors.Malformed(`expected an ITEM at line ${cursor.line}`);
        }

        const item = line.slice(ITEM.length).trim();
        if(item.startsWith('ATOMS')){
            return readAtomsItem(cursor, item, items);
        }

        if(item === 'TIMESTEP'){
            items.step = integerOf(cursor.next(), 'TIMESTEP');
        }else if(item === 'NUMBER OF ATOMS'){
            items.atoms = integerOf(cursor.next(), 'NUMBER OF ATOMS');
        }else if(item.startsWith('BOX BOUNDS')){
            items.box = readBox(item, [cursor.next(), cursor.next(), cursor.next()]);
        }else{
            cursor.next();
        }
    }

    throw DumpErrors.Malformed('the frame has no ATOMS section');
};

const boundsOf = (positions: Float32Array): FrameBox => {
    const low: [number, number, number] = [Infinity, Infinity, Infinity];
    const high: [number, number, number] = [-Infinity, -Infinity, -Infinity];

    for(let index = 0; index < positions.length; index++){
        const axis = index % 3;
        low[axis] = Math.min(low[axis], positions[index]);
        high[axis] = Math.max(high[axis], positions[index]);
    }

    return { low, high };
};

const readXyzFrame = (cursor: LineCursor, index: number): Frame => {
    const atoms = integerOf(cursor.next(), 'atom count');
    const step = XYZ_TIMESTEP.exec(cursor.next())?.[1];
    const table = readAtomTable(cursor, XYZ_COLUMNS, atoms, POSITION_SETS[0]);

    return toFrame(step === undefined ? index : Number(step), table, boundsOf(table.positions));
};

const readFrames = (text: string, limit: number): Frame[] => {
    const cursor = new LineCursor(splitLines(text));
    const lammps = cursor.peek()?.startsWith(ITEM) ?? false;
    const frames: Frame[] = [];

    while(!cursor.done() && frames.length < limit){
        frames.push(lammps ? readLammpsFrame(cursor) : readXyzFrame(cursor, frames.length));
    }

    return frames;
};

export const parseDump = (text: string): Frame[] => {
    return readFrames(text, Infinity);
};

export const parseDumpFrame = (text: string): Frame => {
    const [frame] = readFrames(text, 1);
    if(!frame){
        throw DumpErrors.Malformed('no frame in the text');
    }

    return frame;
};
