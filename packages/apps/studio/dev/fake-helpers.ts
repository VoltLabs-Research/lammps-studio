import { Run, RunSummary } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { FakeState } from './fake-data';

const summaryOf = ({ number, state, startedAt, endedAt, progress, error }: Run): RunSummary => ({
    number,
    state,
    startedAt,
    endedAt,
    progress,
    error
});

export const withRun = (state: FakeState, simulation: Simulation): Simulation => {
    const run = state.runs.get(simulation.id);

    return { ...simulation, lastRun: run ? summaryOf(run) : null };
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
