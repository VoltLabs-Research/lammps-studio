import type { FrameInfo, Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { UnitStyle } from '@lammps-studio/contracts/script/domain';
import type { BentoSeries } from '@/modules/charts/domain/chart';
import { bentoSeries, findStressStrain, sectionSteps, STEP_COLUMN, STRESS_STRAIN_KEY } from '@/modules/charts/utils/bento-series';
import { peakIndex } from '@/modules/charts/utils/peak-index';
import { hasYielded } from '@/modules/charts/utils/series-chart';
import type { BarInfo, RulerSpan, ViewedFrames } from '@/modules/viewport/domain/workspace';
import { formatInt, joinDetails } from '@/shared/utils/format';

const STRAIN_DIGITS = 3;
const STRESS_DIGITS = 2;
const NO_DUMP = 'no dump yet';

const stepText = (step: number): string => `Step ${formatInt(step)}`;

const stressStrainAt = (thermo: ThermoSection[], step: number): string[] => {
    for(const section of [...thermo].reverse()){
        const pair = findStressStrain(section.columns);
        const row = section.rows.find((values) => values[section.columns.indexOf(STEP_COLUMN)] === step);
        if(!pair || !row) continue;

        const strain = row[section.columns.indexOf(pair.strain)];
        const stress = row[section.columns.indexOf(pair.stress)];

        return [`ε ${strain.toFixed(STRAIN_DIGITS)}`, `σ ${stress.toFixed(STRESS_DIGITS)}`];
    }

    return [];
};

const behindText = (view: ViewedFrames, frame: FrameInfo): string | null => {
    const running = view.run?.state === 'running';
    if(view.following || !running || view.position >= view.frames.length - 1) return null;

    return `${formatInt((view.run?.progress.step ?? frame.step) - frame.step)} steps behind`;
};

export const barInfoOf = (view: ViewedFrames): BarInfo | null => {
    const frame = view.frames[view.position];
    if(frame) return { step: stepText(frame.step), meta: joinDetails(...stressStrainAt(view.thermo, frame.step), behindText(view, frame)) };
    if(view.run?.state !== 'running') return null;

    return { step: stepText(view.run.progress.step), meta: NO_DUMP };
};

export const rulerSpanOf = (frames: FrameInfo[], run: Run | null): RulerSpan => {
    const first = frames[0]?.step ?? 0;
    const last = frames.at(-1)?.step ?? first;

    return { startStep: first, endStep: Math.max(last, run?.progress.totalSteps ?? last) };
};

const stressStrainSeries = (section: ThermoSection, units: UnitStyle): BentoSeries | null =>
    bentoSeries(section, units).find((series) => series.key === STRESS_STRAIN_KEY) ?? null;

export const yieldStepOf = (thermo: ThermoSection[], units: UnitStyle): number | null => {
    const section = [...thermo].reverse().find((candidate) => findStressStrain(candidate.columns) !== null);
    const series = section ? stressStrainSeries(section, units) : null;
    if(!section || !series || !hasYielded(series)) return null;

    return sectionSteps(section)[peakIndex(series.ys)];
};
