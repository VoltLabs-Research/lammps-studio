import { OutputBatch, RunFrame } from '../contracts/domain/run';
import { FrameInfo, LogLine } from '@lammps-studio/contracts/run/domain';
import { LogRead, META_PREFIX } from '@lammps-studio/lammps/log/domain';
import LogReader from '@lammps-studio/lammps/log/LogReader';
import { splitLines } from '@lammps-studio/lammps/shared/text';
import { DumpFrame } from '@lammps-studio/runtime/domain/dump/DumpFrame';

const NEWLINE = '\n';

const emptyBatch = (): OutputBatch => ({
    lines: [],
    rows: [],
    frames: []
});

const completeLinesOf = (screen: string): string[] => {
    const lines = splitLines(screen);
    if(screen.endsWith(NEWLINE)) return lines;

    return lines.slice(0, -1);
};

export const frameInfoOf = ({ index, step, atoms }: RunFrame): FrameInfo => ({
    index,
    step,
    atoms
});

export default class RunOutput{
    readonly reader = new LogReader();
    readonly lines: LogLine[] = [];
    readonly frames: RunFrame[] = [];
    #batch = emptyBatch();
    #frameKeys = new Set<string>();
    #recorded = 0;

    static restore(screen: string): RunOutput{
        const output = new RunOutput();
        const lines = completeLinesOf(screen);
        lines.forEach((text) => output.#read(text));
        output.#recorded = lines.filter((text) => !text.startsWith(META_PREFIX)).length;

        return output;
    }

    get pending(): boolean{
        return this.#batch.lines.length > 0 || this.#batch.frames.length > 0;
    }

    container(text: string){
        if(this.#recorded > 0){
            this.#recorded -= 1;
            return;
        }

        this.#print(text);
    }

    meta(text: string){
        this.#print(`${META_PREFIX}${text}`);
    }

    frame({ path, step, atoms, byteOffset }: DumpFrame){
        const key = `${path}@${byteOffset}`;
        if(this.#frameKeys.has(key)) return;

        const frame: RunFrame = {
            index: this.frames.length,
            step,
            atoms,
            path,
            byteOffset
        };
        this.#frameKeys.add(key);
        this.frames.push(frame);
        this.#batch.frames.push(frameInfoOf(frame));
    }

    take(): OutputBatch{
        const batch = this.#batch;
        this.#batch = emptyBatch();

        return batch;
    }

    #print(text: string){
        const { line, thermo } = this.#read(text);
        this.#batch.lines.push(line);
        if(thermo) this.#batch.rows.push(thermo);
    }

    #read(text: string): LogRead{
        const read = this.reader.read(text);
        this.lines.push(read.line);

        return read;
    }
}
