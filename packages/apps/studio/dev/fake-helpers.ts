import { Run, RunSummary } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { SimulationErrors } from '@lammps-studio/contracts/simulation/errors';
import { fail, Failure } from './fake-router';
import { FakeState, latestFrame, latestRecord } from './fake-state';

const summaryOf = ({ number, state, startedAt, endedAt, progress, error }: Run): RunSummary => ({
    number,
    state,
    startedAt,
    endedAt,
    progress,
    error
});

export const withRun = (state: FakeState, simulation: Simulation): Simulation => {
    const record = latestRecord(state, simulation.id);

    return {
        ...simulation,
        lastRun: record ? summaryOf(record.run) : null,
        hasPreview: latestFrame(state, simulation.id) !== null
    };
};

export const withSimulation = <T>(state: FakeState, simulationId: string, read: (simulation: Simulation) => T): T | Failure => {
    const simulation = state.simulations.find((item) => item.id === simulationId);
    if(!simulation) return fail(SimulationErrors, 'NotFound');

    return read(simulation);
};

export const slugOf = (name: string, taken: string[]): string => {
    const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'simulation';
    let slug = base;
    for(let suffix = 2; taken.includes(slug); suffix += 1){
        slug = `${base}-${suffix}`;
    }

    return slug;
};

export const randomHash = (): string => Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
