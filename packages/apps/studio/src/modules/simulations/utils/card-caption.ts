import { RunError, RunProgress } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { isActive, phaseOf } from '@/modules/simulations/utils/simulation-phase';
import { DetailPart, formatAgo, formatDuration, formatEta, formatInt, formatPercent, joinDetails as joined, secondsBetween } from '@/shared/utils/format';

export interface CardCaption{
    word: string;
    detail: string;
    danger: boolean;
}

export interface CaptionContext{
    machineName: string;
    buildProgress: number | null;
    now: number;
}

const caption = (word: string, detail: string): CardCaption => ({ word, detail, danger: false });

const atStep = (step: number | null): DetailPart => (step === null ? null : `at step ${formatInt(step)}`);

const runningDetail = (progress: RunProgress, machineName: string): string => {
    if(progress.totalSteps === null) return joined(`step ${formatInt(progress.step)}`, machineName);

    const remaining = progress.totalSteps - progress.step;
    const eta = progress.stepsPerSecond ? formatEta(remaining / progress.stepsPerSecond) : null;

    return joined(formatPercent(progress.step / progress.totalSteps), eta, machineName);
};

const finishedDetail = (startedAt: string, endedAt: string | null, now: number): string => {
    if(endedAt === null) return '';

    return joined(formatAgo(endedAt, now), formatDuration(secondsBetween(startedAt, endedAt)));
};

const failedCaption = (error: RunError | null): CardCaption => ({
    word: 'Failed',
    detail: joined(atStep(error?.step ?? null), error?.message ?? null),
    danger: true
});

export const captionOf = (simulation: Simulation, { machineName, buildProgress, now }: CaptionContext): CardCaption => {
    const run = simulation.lastRun;
    if(!run) return simulation.entry === null ? caption('Draft', 'No entry script') : caption('Not run yet', machineName);

    switch(run.state){
        case 'queued': return caption('Queued', machineName);
        case 'building': return caption('Building', joined('LAMMPS', buildProgress === null ? null : formatPercent(buildProgress), machineName));
        case 'starting': return caption('Starting', machineName);
        case 'running': return caption('Running', runningDetail(run.progress, machineName));
        case 'stopping': return caption('Stopping', joined(`step ${formatInt(run.progress.step)}`, machineName));
        case 'cancelled': return caption('Stopped', joined(atStep(run.progress.step)));
        case 'completed': return caption('Finished', finishedDetail(run.startedAt, run.endedAt, now));
        case 'failed': return failedCaption(run.error);
    }
};

export const progressOf = (simulation: Simulation, buildProgress: number | null): number | null => {
    const run = simulation.lastRun;
    if(!run || !isActive(phaseOf(simulation))) return null;
    if(run.state === 'building') return buildProgress;
    if(run.progress.totalSteps === null) return null;

    return run.progress.step / run.progress.totalSteps;
};
