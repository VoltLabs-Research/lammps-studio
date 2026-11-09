import type { LogLine, RunError, ThermoSection } from '@lammps-studio/contracts/run/domain';

export const META_PREFIX = 'studio › ';

export const STEP_COLUMN = 'Step';

export type SectionKind = 'run' | 'minimize';

export interface ThermoRow{
    section: number;
    columns: string[];
    values: number[];
}

export interface LogRead{
    line: LogLine;
    thermo: ThermoRow | null;
}

export interface ParsedLog{
    lines: LogLine[];
    sections: ThermoSection[];
    error: RunError | null;
    warnings: number;
    totalSteps: number | null;
    lastStep: number | null;
}

export interface SectionProgress{
    step: number;
    totalSteps: number | null;
    section: number;
    sections: number;
}
