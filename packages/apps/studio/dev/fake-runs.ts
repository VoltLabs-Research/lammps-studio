import { FrameInfo, LogLine, Run } from '@lammps-studio/contracts/run/domain';
import { ThermoRow } from '@lammps-studio/lammps/log/domain';
import LogReader from '@lammps-studio/lammps/log/LogReader';

export interface RunRecord{
    run: Run;
    reader: LogReader;
    log: LogLine[];
    frames: FrameInfo[];
}

export interface RunChange{
    patch: Partial<Run>;
    lines: string[];
    frames: FrameInfo[];
}

export interface RunBatch{
    lines: LogLine[];
    rows: ThermoRow[];
    frames: FrameInfo[];
}

export const recordOf = (run: Run): RunRecord => ({
    run,
    reader: new LogReader(),
    log: [],
    frames: []
});

export const applyChange = (record: RunRecord, { patch, lines, frames }: RunChange): RunBatch => {
    const read = lines.map((text) => record.reader.read(text));
    const logged = read.map(({ line }) => line);
    record.log.push(...logged);
    record.frames.push(...frames);
    record.run = {
        ...record.run,
        ...patch,
        warnings: record.reader.warnings,
        frames: record.frames.length
    };

    return {
        lines: logged,
        rows: read.flatMap(({ thermo }) => (thermo ? [thermo] : [])),
        frames
    };
};
