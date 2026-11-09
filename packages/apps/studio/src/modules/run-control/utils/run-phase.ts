import { Run, RunState } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { RunPhase } from '@/modules/run-control/domain/run-control';

const ACTIVE_STATES: readonly RunState[] = ['queued', 'building', 'starting', 'running', 'stopping'];

export const isActiveState = (state: RunState): boolean => ACTIVE_STATES.includes(state);

export const runPhaseOf = (simulation: Simulation | null, run: Run | null): RunPhase => {
    if(run && isActiveState(run.state)) return run.state;
    if(simulation?.entry === null) return 'noscript';
    if(!run) return 'idle';

    return run.state;
};
