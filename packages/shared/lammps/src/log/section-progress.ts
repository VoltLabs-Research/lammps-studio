import type { ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { ScriptRun } from '@lammps-studio/contracts/script/domain';
import { SectionProgress, STEP_COLUMN } from './domain';
import LogReader from './LogReader';

const stepsIn = (section: ThermoSection): number => {
    const column = section.columns.indexOf(STEP_COLUMN);
    const first = section.rows[0]?.[column];
    const last = section.rows.at(-1)?.[column];
    if(first === undefined || last === undefined){
        return 0;
    }

    return last - first;
};

export const sectionProgress = (reader: LogReader, runs: ScriptRun[]): SectionProgress => {
    const opened = reader.sections.filter((_, index) => reader.sectionKinds[index] === 'run');
    const current = opened.at(-1);
    const section = Math.max(opened.length, 1);

    return {
        step: current ? stepsIn(current) : 0,
        totalSteps: runs[section - 1]?.steps ?? null,
        section,
        sections: Math.max(runs.length, opened.length, 1)
    };
};
