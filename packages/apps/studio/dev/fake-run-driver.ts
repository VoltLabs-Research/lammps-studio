import { Run } from '@lammps-studio/contracts/run/domain';
import { LogContext } from './cu/cu-log';
import { TICK_SECONDS } from './fake-clock';
import { advanceCuTick, beginCu, cancelCu, CU_SIMULATION_ID, killCu, stopCu } from './fake-cu-run';
import { RunChange } from './fake-runs';

export interface RunDriver{
    begin: (run: Run, context: LogContext) => RunChange;
    advance: (run: Run, context: LogContext, at: string) => RunChange;
    stop: () => RunChange;
    cancel: (run: Run, context: LogContext, at: string) => RunChange;
    kill: (run: Run, at: string) => RunChange;
}

const STARTED_STEPS_PER_SECOND = 512;

const patchOnly = (patch: Partial<Run>): RunChange => ({ patch, lines: [], frames: [] });

const advanceProgress = ({ progress }: Run, _context: LogContext, at: string): RunChange => {
    const { totalSteps, stepsPerSecond } = progress;
    if(totalSteps === null || stepsPerSecond === null) return patchOnly({});

    const step = Math.min(totalSteps, Math.round(progress.step + stepsPerSecond * TICK_SECONDS));
    if(step < totalSteps) return patchOnly({ progress: { ...progress, step } });

    return patchOnly({ state: 'completed', endedAt: at, progress: { ...progress, step } });
};

export const endProgress = ({ progress }: Run, at: string): RunChange =>
    patchOnly({ state: 'cancelled', endedAt: at, progress: { ...progress, stepsPerSecond: null } });

const PROGRESS_DRIVER: RunDriver = {
    begin: ({ progress }) => patchOnly({ state: 'running', progress: { ...progress, stepsPerSecond: STARTED_STEPS_PER_SECOND } }),
    advance: advanceProgress,
    stop: () => patchOnly({ state: 'stopping' }),
    cancel: (run, _context, at) => endProgress(run, at),
    kill: endProgress
};

const CU_DRIVER: RunDriver = {
    begin: (_run, context) => beginCu(context),
    advance: advanceCuTick,
    stop: stopCu,
    cancel: cancelCu,
    kill: killCu
};

export const driverOf = (simulationId: string): RunDriver => (simulationId === CU_SIMULATION_ID ? CU_DRIVER : PROGRESS_DRIVER);
