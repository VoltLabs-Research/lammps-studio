import type RunOutput from '../../services/RunOutput';
import { FrameInfo, LogLine, Run } from '@lammps-studio/contracts/run/domain';
import { ThermoRow } from '@lammps-studio/lammps/log/domain';
import { ScriptRun } from '@lammps-studio/contracts/script/domain';

export type StopRequest = 'none' | 'term' | 'kill';

export interface RunFrame extends FrameInfo{
    path: string;
    byteOffset: number;
}

export interface OutputBatch{
    lines: LogLine[];
    rows: ThermoRow[];
    frames: FrameInfo[];
}

export interface RateSample{
    at: number;
    step: number;
}

export interface RunLocation{
    simulationId: string;
    folder: string;
    runDir: string;
    plan: ScriptRun[];
}

export interface LocatedRun{
    run: Run;
    output: RunOutput | null;
    runDir: string;
}
