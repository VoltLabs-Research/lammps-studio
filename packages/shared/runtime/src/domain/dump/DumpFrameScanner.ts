import { DumpErrors } from '../shared/errors';

const NEWLINE = 0x0a;
const ITEM = 'ITEM: ';
const XYZ_TIMESTEP = /Timestep:\s*(-?\d+)/;
const INTEGER = /^\s*-?\d+\s*$/;
const SNIFF_BYTES = 64;
const BOX_LINES = 3;
const XYZ_HEADER_LINES = 2;

export type DumpFormat = 'lammps' | 'xyz';

export type DumpSniff = DumpFormat | 'not-dump' | 'undecided';

export interface DumpFrameLocation{
    step: number;
    index: number;
    byteOffset: number;
    byteLength: number;
}

interface FrameShape{
    step: number;
    lines: number;
}

const countNewlines = (buffer: Buffer): number => {
    let count = 0;
    for(let at = buffer.indexOf(NEWLINE); at >= 0; at = buffer.indexOf(NEWLINE, at + 1)){
        count += 1;
    }

    return count;
};

const endOfLines = (buffer: Buffer, lines: number): number => {
    let end = 0;
    for(let line = 0; line < lines; line++){
        end = buffer.indexOf(NEWLINE, end) + 1;
    }

    return end;
};

const readLines = (buffer: Buffer, count: number): string[] | null => {
    const lines: string[] = [];
    let start = 0;

    while(lines.length < count){
        const end = buffer.indexOf(NEWLINE, start);
        if(end < 0){
            return null;
        }

        lines.push(buffer.toString('utf8', start, end));
        start = end + 1;
    }

    return lines;
};

export const sniffDumpFormat = (head: Buffer, fileName: string): DumpSniff => {
    const text = head.toString('utf8', 0, Math.min(head.length, SNIFF_BYTES));
    const firstLine = text.split('\n')[0];
    const complete = text.includes('\n') || head.length >= SNIFF_BYTES;

    if(text.startsWith(ITEM)){
        return 'lammps';
    }

    if(!complete){
        return ITEM.startsWith(text) || INTEGER.test(text) ? 'undecided' : 'not-dump';
    }

    return fileName.endsWith('.xyz') && INTEGER.test(firstLine) ? 'xyz' : 'not-dump';
};

export default class DumpFrameScanner{
    #pending = Buffer.alloc(0);
    #newlines = 0;
    #offset: number;
    #index = 0;

    constructor(
        private readonly format: DumpFormat,
        offset: number
    ){
        this.#offset = offset;
    }

    push(chunk: Buffer): DumpFrameLocation[]{
        this.#pending = Buffer.concat([this.#pending, chunk]);
        this.#newlines += countNewlines(chunk);

        const frames: DumpFrameLocation[] = [];
        for(let frame = this.#next(); frame !== null; frame = this.#next()){
            frames.push(frame);
        }

        return frames;
    }

    #next(): DumpFrameLocation | null{
        const shape = this.format === 'lammps' ? this.#lammpsShape() : this.#xyzShape();
        if(shape === null || this.#newlines < shape.lines){
            return null;
        }

        const byteLength = endOfLines(this.#pending, shape.lines);
        const location = {
            step: shape.step,
            index: this.#index,
            byteOffset: this.#offset,
            byteLength
        };

        this.#pending = this.#pending.subarray(byteLength);
        this.#newlines -= shape.lines;
        this.#offset += byteLength;
        this.#index += 1;

        return location;
    }

    #lammpsShape(): FrameShape | null{
        let step: number | null = null;
        let atoms: number | null = null;
        let consumed = 0;

        for(let header = readLines(this.#pending, 1); header !== null; header = readLines(this.#pending, consumed + 1)){
            const item = header[consumed];
            if(!item.startsWith(ITEM)){
                throw DumpErrors.Malformed(`expected an ITEM, found "${item.slice(0, SNIFF_BYTES)}"`);
            }

            if(item.startsWith(`${ITEM}ATOMS`)){
                if(step === null || atoms === null){
                    throw DumpErrors.Malformed('ATOMS before TIMESTEP or NUMBER OF ATOMS');
                }

                return { step, lines: consumed + 1 + atoms };
            }

            const span = item.startsWith(`${ITEM}BOX BOUNDS`) ? 1 + BOX_LINES : 2;
            const lines = readLines(this.#pending, consumed + span);
            if(lines === null){
                return null;
            }

            if(item === `${ITEM}TIMESTEP`){
                step = Number(lines[consumed + 1]);
            }else if(item === `${ITEM}NUMBER OF ATOMS`){
                atoms = Number(lines[consumed + 1]);
            }

            consumed += span;
        }

        return null;
    }

    #xyzShape(): FrameShape | null{
        const lines = readLines(this.#pending, XYZ_HEADER_LINES);
        if(lines === null){
            return null;
        }

        const [count, comment] = lines;
        if(!INTEGER.test(count)){
            throw DumpErrors.Malformed(`expected an atom count, found "${count.slice(0, SNIFF_BYTES)}"`);
        }

        const step = XYZ_TIMESTEP.exec(comment)?.[1];
        return { step: step === undefined ? this.#index : Number(step), lines: XYZ_HEADER_LINES + Number(count) };
    }
}
