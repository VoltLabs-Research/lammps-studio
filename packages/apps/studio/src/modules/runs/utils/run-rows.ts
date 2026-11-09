import type { Run, RunConfig, RunProgress } from '@lammps-studio/contracts/run/domain';
import type { RunGroupModel, RunListContext, RunRowModel, RunRowStatus } from '@/modules/runs/domain/runs';
import { formatDay, formatDuration, formatInt, formatPercent, secondsBetween } from '@/shared/utils/format';

const SEPARATOR = ' · ';
const NOT_STARTED: Run['state'][] = ['queued', 'building', 'starting'];
const TRAILING_PERIOD = /\.$/;

const plural = (count: number, noun: string): string => `${formatInt(count)} ${noun}${count === 1 ? '' : 's'}`;

export const runResources = (config: RunConfig): string => {
    const ranks = `${config.mpiRanks} MPI`;
    if(config.accelerator === 'omp') return `${ranks} × ${config.threadsPerRank} OpenMP`;
    if(config.accelerator === 'kokkos') return `${ranks} × ${config.threadsPerRank} Kokkos`;
    if(config.accelerator === 'gpu') return `${ranks} · ${plural(config.gpus, 'GPU')}`;

    return ranks;
};

const stepsDone = ({ step, totalSteps }: RunProgress): string => {
    if(totalSteps === null) return formatInt(step);

    return `${formatInt(step)} of ${formatInt(totalSteps)}`;
};

const runningState = (progress: RunProgress): string => {
    if(progress.section < progress.sections) return `Section ${progress.section} of ${progress.sections} · step ${stepsDone(progress)}`;

    return `Step ${stepsDone(progress)}`;
};

const failedState = (run: Run): string => {
    const message = run.error?.message.replace(TRAILING_PERIOD, '') ?? 'LAMMPS stopped with an error';
    const step = run.error?.step ?? null;
    if(step === null) return message;

    return `${message} at step ${formatInt(step)}`;
};

const completedState = (run: Run): string => {
    const steps = plural(run.progress.step, 'step');
    if(run.endedAt === null) return steps;

    return `${steps} in ${formatDuration(secondsBetween(run.startedAt, run.endedAt))}`;
};

const stateText = (run: Run, buildProgress: number | null): string => {
    switch(run.state){
        case 'queued': return 'Waiting in the queue';
        case 'building': return buildProgress === null ? 'Waiting for the build' : `Waiting for the build · ${formatPercent(buildProgress)}`;
        case 'starting': return 'Starting the container';
        case 'running': return runningState(run.progress);
        case 'stopping': return `Stopping at step ${formatInt(run.progress.step)}`;
        case 'cancelled': return `Stopped at step ${formatInt(run.progress.step)}`;
        case 'completed': return completedState(run);
        case 'failed': return failedState(run);
    }
};

const STATE_WORD: Record<Exclude<Run['state'], 'running'>, string> = {
    queued: 'Queued',
    building: 'Building',
    starting: 'Starting',
    stopping: 'Stopping',
    cancelled: 'Stopped',
    completed: 'Completed',
    failed: 'Failed'
};

export const runStatus = (run: Run): RunRowStatus => {
    if(run.state !== 'running') return { kind: 'word', word: STATE_WORD[run.state], danger: run.state === 'failed' };

    const { step, totalSteps } = run.progress;

    return { kind: 'progress', fraction: totalSteps ? Math.min(step / totalSteps, 1) : 0 };
};

export const runRow = (run: Run, buildProgress: number | null): RunRowModel => ({
    number: run.number,
    sub: [stateText(run, buildProgress), runResources(run.config)].join(SEPARATOR),
    status: runStatus(run),
    disabled: NOT_STARTED.includes(run.state),
    folder: run.outputDir
});

export const runGroups = (runs: Run[], { now, buildProgress }: RunListContext): RunGroupModel[] => {
    const groups: RunGroupModel[] = [];
    const newest = [...runs].sort((a, b) => b.number - a.number);
    for(const run of newest){
        const title = formatDay(run.startedAt, now);
        const row = runRow(run, buildProgress(run.buildHash));
        const last = groups.at(-1);
        if(last?.title === title) last.rows.push(row);
        else groups.push({ title, rows: [row] });
    }

    return groups;
};

export const runsSub = (count: number): string => plural(count, 'run');
