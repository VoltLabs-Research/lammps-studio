import { OutputBatch, RunFrame } from '../contracts/domain/run';
import { FrameInfo, LogLine } from '@lammps-studio/contracts/run/domain';
import { META_PREFIX } from '@lammps-studio/lammps/log/domain';
import LogReader from '@lammps-studio/lammps/log/LogReader';
import { DumpFrame } from '@lammps-studio/runtime/domain/dump/DumpFrame';

const emptyBatch = (): OutputBatch => ({
    lines: [],
    rows: [],
    frames: []
});

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

    get pending(): boolean{
        return this.#batch.lines.length > 0 || this.#batch.frames.length > 0;
    }

    container(text: string){
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
        const { line, thermo } = this.reader.read(text);
        this.lines.push(line);
        this.#batch.lines.push(line);
        if(thermo) this.#batch.rows.push(thermo);
    }
}
