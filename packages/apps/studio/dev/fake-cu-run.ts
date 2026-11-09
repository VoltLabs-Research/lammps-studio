import { Machine } from '@lammps-studio/contracts/machine/domain';
import { FrameInfo, Run, RunProgress } from '@lammps-studio/contracts/run/domain';
import { DUMP_EVERY, gauss2, STEPS_EQ, STEPS_RUN, THERMO_EVERY, TPS, WIRE } from './cu/cu-model';
import {
    equilibrationEndLines,
    equilibrationLine,
    failLines,
    finishLines,
    killedLine,
    LogContext,
    missingPackageLines,
    MISSING_PACKAGE,
    NEIGHBOR_OVERFLOW,
    setupLines,
    startLines,
    stoppedLines,
    stopRequestedLine,
    tensionLine,
    warningLines
} from './cu/cu-log';
import { applyChange, mergeChanges, RunChange, RunRecord } from './fake-runs';

export interface RunPosition{
    section: number;
    step: number;
}

export const CU_SIMULATION_ID = 'cu-nanowire-tension';

export const EQUILIBRATION = 1;
export const TENSION = 2;
const SECTIONS = 2;
const SPEED_JITTER = 0.012;
const SPEED_SEED = 21;

const speedAt = (step: number): number => TPS * (1 + SPEED_JITTER * gauss2(step / THERMO_EVERY, SPEED_SEED));

export const plannedCuProgress = (): RunProgress => ({
    step: 0,
    totalSteps: STEPS_EQ,
    section: EQUILIBRATION,
    sections: SECTIONS,
    stepsPerSecond: null
});

export const contextOf = (machines: Machine[], { number, config, buildHash }: Run): LogContext => ({
    runNumber: number,
    machineName: machines.find((machine) => machine.id === config.machineId)?.name ?? config.machineId,
    buildHash,
    config
});

const frameAt = (step: number): FrameInfo => ({
    index: step / DUMP_EVERY,
    step,
    atoms: WIRE.count
});

export const beginCu = (context: LogContext): RunChange => ({
    patch: {
        state: 'running',
        progress: { ...plannedCuProgress(), stepsPerSecond: speedAt(0) }
    },
    lines: [...startLines(context), ...setupLines(), equilibrationLine(0)],
    frames: []
});

const equilibrationStep = (progress: RunProgress, step: number, context: LogContext): RunChange => {
    if(step < STEPS_EQ) return { patch: { progress: { ...progress, step } }, lines: [equilibrationLine(step)], frames: [] };

    return {
        patch: { progress: { ...progress, step: 0, totalSteps: STEPS_RUN, section: TENSION, stepsPerSecond: speedAt(0) } },
        lines: [equilibrationLine(step), ...equilibrationEndLines(context.config), tensionLine(0)],
        frames: [frameAt(0)]
    };
};

const tensionStep = (progress: RunProgress, step: number, context: LogContext, at: string): RunChange => {
    const lines = [tensionLine(step), ...warningLines(step)];
    const frames = step % DUMP_EVERY === 0 ? [frameAt(step)] : [];
    if(step < STEPS_RUN) return { patch: { progress: { ...progress, step, stepsPerSecond: speedAt(step) } }, lines, frames };

    return {
        patch: { state: 'completed', endedAt: at, progress: { ...progress, step, stepsPerSecond: null } },
        lines: [...lines, ...finishLines(context)],
        frames
    };
};

export const advanceCu = ({ progress }: Run, context: LogContext, at: string): RunChange => {
    const step = progress.step + THERMO_EVERY;
    if(progress.section === EQUILIBRATION) return equilibrationStep(progress, step, context);

    return tensionStep(progress, step, context, at);
};

export const advanceCuTick = (run: Run, context: LogContext, at: string): RunChange => {
    const first = advanceCu(run, context, at);
    const next = { ...run, ...first.patch };
    if(run.progress.section !== EQUILIBRATION || next.progress.section !== EQUILIBRATION) return first;

    return mergeChanges(first, advanceCu(next, context, at));
};

const reached = ({ section, step }: RunProgress, target: RunPosition): boolean => section > target.section || (section === target.section && step >= target.step);

export const replayCu = (record: RunRecord, context: LogContext, target: RunPosition, at: string) => {
    applyChange(record, beginCu(context));
    while(record.run.state === 'running' && !reached(record.run.progress, target)){
        applyChange(record, advanceCu(record.run, context, at));
    }
};

export const stopCu = (): RunChange => ({
    patch: { state: 'stopping' },
    lines: [stopRequestedLine()],
    frames: []
});

export const cancelCu = ({ progress }: Run, context: LogContext, at: string): RunChange => ({
    patch: { state: 'cancelled', endedAt: at, progress: { ...progress, stepsPerSecond: null } },
    lines: stoppedLines(context, progress.step),
    frames: []
});

export const killCu = ({ progress }: Run, at: string): RunChange => ({
    patch: { state: 'cancelled', endedAt: at, progress: { ...progress, stepsPerSecond: null } },
    lines: [killedLine(progress.step)],
    frames: []
});

export const failCu = (record: RunRecord, step: number, at: string): RunChange => ({
    patch: {
        state: 'failed',
        endedAt: at,
        progress: { ...record.run.progress, step, stepsPerSecond: null },
        error: { message: NEIGHBOR_OVERFLOW, step, line: record.log.length }
    },
    lines: failLines(step),
    frames: []
});

export const missingPackageCu = (record: RunRecord, context: LogContext, at: string): RunChange => ({
    patch: {
        state: 'failed',
        endedAt: at,
        error: { message: MISSING_PACKAGE, step: null, line: record.log.length + startLines(context).length }
    },
    lines: [...startLines(context), ...missingPackageLines()],
    frames: []
});
