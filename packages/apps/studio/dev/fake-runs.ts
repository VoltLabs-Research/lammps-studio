import { FrameInfo, LogLine, Run, RunConfig, RunProgress, RunState } from '@lammps-studio/contracts/run/domain';
import { ThermoRow } from '@lammps-studio/lammps/log/domain';
import LogReader from '@lammps-studio/lammps/log/LogReader';

export interface RunRecord{
    run: Run;
    reader: LogReader;
    log: LogLine[];
    frames: FrameInfo[];
    wait: number;
}

export interface RunChange{
    patch: Partial<Run>;
    lines: string[];
    frames: FrameInfo[];
}

export interface RunPlan{
    simulationId: string;
    number: number;
    state: RunState;
    config: RunConfig;
    buildHash: string;
    startedAt: string;
    progress: RunProgress;
}

export interface RunBatch{
    lines: LogLine[];
    rows: ThermoRow[];
    frames: FrameInfo[];
}

export const RUNS_DIR = 'runs';

export const plannedRun = (plan: RunPlan): Run => ({
    ...plan,
    endedAt: null,
    error: null,
    outputDir: `${RUNS_DIR}/run-${plan.number}`,
    frames: 0,
    warnings: 0
});

export const recordOf = (run: Run): RunRecord => ({
    run,
    reader: new LogReader(),
    log: [],
    frames: [],
    wait: 0
});

export const mergeChanges = (first: RunChange, second: RunChange): RunChange => ({
    patch: { ...first.patch, ...second.patch },
    lines: [...first.lines, ...second.lines],
    frames: [...first.frames, ...second.frames]
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
