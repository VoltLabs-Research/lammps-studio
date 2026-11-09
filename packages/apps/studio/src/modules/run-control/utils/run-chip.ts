import { Build } from '@lammps-studio/contracts/build/domain';
import { Run, RunProgress } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { RunChipModel, RunChipTone } from '@/modules/run-control/domain/run-control';
import { timeLeftText } from '@/modules/run-control/utils/build-eta';
import { runPhaseOf } from '@/modules/run-control/utils/run-phase';
import { formatDuration, formatEta, formatInt, formatPercent, joinDetails, secondsBetween } from '@/shared/utils/format';

export interface RunChipContext{
    build: Build | null;
    machineName: string;
    now: number;
}

const chip = (label: string, meta: string, tone: RunChipTone = 'neutral'): RunChipModel => ({
    label,
    meta,
    tone,
    jump: 'output'
});

const NO_SCRIPT: RunChipModel = {
    label: 'No entry script',
    meta: '',
    tone: 'warn',
    jump: 'editor'
};

const atStep = (step: number): string => `step ${formatInt(step)}`;

const buildMeta = (build: Build | null, now: number): string => {
    if(!build) return '';

    return joinDetails(formatPercent(build.progress), timeLeftText(build, now));
};

const runningMeta = (progress: RunProgress): string => {
    if(progress.totalSteps === null) return atStep(progress.step);

    const remaining = progress.totalSteps - progress.step;
    const eta = progress.stepsPerSecond ? formatEta(remaining / progress.stepsPerSecond) : null;

    return joinDetails(formatPercent(progress.step / progress.totalSteps), eta);
};

const stoppedMeta = (progress: RunProgress): string => {
    if(progress.totalSteps === null) return atStep(progress.step);

    return `${atStep(progress.step)} of ${formatInt(progress.totalSteps)}`;
};

const completedMeta = (run: Run): string => {
    if(run.endedAt === null) return '';

    return formatDuration(secondsBetween(run.startedAt, run.endedAt));
};

export const runChipOf = (simulation: Simulation | null, run: Run | null, context: RunChipContext): RunChipModel | null => {
    if(runPhaseOf(simulation, run) === 'noscript') return NO_SCRIPT;
    if(!run) return null;

    switch(run.state){
        case 'queued': return chip('Queued', context.machineName);
        case 'building': return chip('Building LAMMPS', buildMeta(context.build, context.now));
        case 'starting': return chip('Starting', '');
        case 'running': return chip('Running', runningMeta(run.progress));
        case 'stopping': return chip('Stopping', atStep(run.progress.step));
        case 'cancelled': return chip('Stopped', stoppedMeta(run.progress));
        case 'completed': return chip('Completed', completedMeta(run));
        case 'failed': return chip('Failed', `near ${atStep(run.error?.step ?? run.progress.step)}`, 'danger');
    }
};
