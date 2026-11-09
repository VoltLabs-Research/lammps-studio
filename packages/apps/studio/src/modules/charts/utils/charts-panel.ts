import type { Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { sectionSteps } from '@/modules/charts/utils/bento-series';
import { formatInt } from '@/shared/utils/format';

const THERMO = 'Thermo';

export const chartedSection = (sections: ThermoSection[]): ThermoSection | null => {
    const section = sections.at(-1);
    if(!section || section.rows.length === 0) return null;

    return section;
};

export const chartEndStep = (sections: ThermoSection[], run: Run | null, script: ScriptInfo | null): number | null => {
    const section = chartedSection(sections);
    if(!section) return null;

    const steps = run?.progress.totalSteps ?? script?.runs[sections.length - 1]?.steps ?? null;
    if(steps === null) return null;

    return sectionSteps(section)[0] + steps;
};

export const chartsSub = (sections: ThermoSection[], live: boolean): string => {
    const section = chartedSection(sections);
    if(!section) return THERMO;

    const rows = `${formatInt(section.rows.length)} row${section.rows.length === 1 ? '' : 's'}`;
    if(!live) return `${THERMO} · ${rows}`;

    return `${THERMO} · ${rows} · live`;
};
