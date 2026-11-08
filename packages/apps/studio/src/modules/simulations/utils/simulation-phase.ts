import { RunState } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';

export type SimulationPhase = 'draft' | 'queued' | 'building' | 'starting' | 'running' | 'stopping' | 'stopped' | 'finished' | 'failed';

const PHASE_OF_RUN: Record<RunState, SimulationPhase> = {
    queued: 'queued',
    building: 'building',
    starting: 'starting',
    running: 'running',
    stopping: 'stopping',
    cancelled: 'stopped',
    completed: 'finished',
    failed: 'failed'
};

const ACTIVE_PHASES: readonly SimulationPhase[] = ['building', 'starting', 'running', 'stopping'];

export const phaseOf = (simulation: Simulation): SimulationPhase => {
    if(!simulation.lastRun) return 'draft';

    return PHASE_OF_RUN[simulation.lastRun.state];
};

export const isActive = (phase: SimulationPhase): boolean => ACTIVE_PHASES.includes(phase);
