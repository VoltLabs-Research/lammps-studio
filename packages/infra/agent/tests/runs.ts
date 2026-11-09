import { Run, RunConfig, RunState } from '@lammps-studio/contracts/run/domain';
import { StudioEvent, StudioEventOf, StudioEventType } from '@lammps-studio/contracts/events/gateway';
import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import RuntimeBuild from '@lammps-studio/runtime/domain/build/Build';
import { BuildIdentity } from '@lammps-studio/runtime/domain/build/BuildSpec';
import { join } from 'node:path';
import { expect } from 'vitest';
import { FakeContainer, FakeDocker } from './fakeDocker';
import { writeTree } from './files';
import { AgentApp } from './harness';
import { request } from './request';
import { createSimulation, folderOf } from './simulations';

export const LAMMPS_VERSION = 'stable_22Jul2025_update1';

export const MELT_SCRIPT = 'units lj\nthermo 50\nrun 100\n';

export const BANNER = 'LAMMPS (22 Jul 2025 - Update 1)';

export const MELT_SETUP = [
    BANNER,
    'Per MPI rank memory allocation (min/avg/max) = 2.706 | 2.706 | 2.706 Mbytes',
    '   Step          Temp          PotEng   '
];

export const meltRow = (step: number): string => `${String(step).padStart(10)}   1.5   -4.7`;

export const MELT_END = [
    'Loop time of 0.126176 on 2 procs for 100 steps with 3 atoms',
    'Total wall time: 0:00:00'
];

export const runConfig = (patch: Partial<RunConfig> = {}): RunConfig => ({
    machineId: 'local',
    version: LAMMPS_VERSION,
    packages: ['MANYBODY'],
    accelerator: 'none',
    mpiRanks: 2,
    threadsPerRank: 1,
    gpus: 0,
    slurm: null,
    entry: 'main.in',
    variables: {},
    ...patch
});

export const identityOf = (...packages: string[]): BuildIdentity => new RuntimeBuild({ version: LAMMPS_VERSION, packages }).identity();

export const runRecord = (simulationId: string, number: number, buildHash: string, state: RunState = 'completed'): Run => ({
    simulationId,
    number,
    state,
    startedAt: '2026-11-08T10:00:00.000Z',
    endedAt: null,
    progress: {
        step: 0,
        totalSteps: null,
        section: 1,
        sections: 1,
        stepsPerSecond: null
    },
    error: null,
    config: runConfig(),
    buildHash,
    outputDir: `runs/run-${number}`,
    frames: 0,
    warnings: 0
});

export const meltSimulation = async (app: AgentApp, name: string): Promise<Simulation> => {
    const simulation = await createSimulation(app, { name });
    await writeTree(folderOf(simulation), { 'main.in': MELT_SCRIPT });

    return simulation;
};

export const runDirOf = (simulation: Simulation, number: number): string => join(folderOf(simulation), 'runs', `run-${number}`);

export const startRun = async (app: AgentApp, simulation: Simulation, patch: Partial<RunConfig> = {}): Promise<Run> => {
    const res = await request(app, runRoutes.start, { params: { simulationId: simulation.id }, body: { config: runConfig(patch) } });
    expect(res.status).toBe(201);

    return res.data();
};

export const fetchRun = async (app: AgentApp, simulation: Simulation, number: number): Promise<Run> => {
    return (await request(app, runRoutes.get, { params: { simulationId: simulation.id, runNumber: number } })).data();
};

export const runningContainer = async (docker: FakeDocker, simulation: Simulation, number: number): Promise<FakeContainer> => {
    await expect.poll(() => docker.container(simulation.id, number)?.state).toBe('running');

    const container = docker.container(simulation.id, number);
    if(!container) throw new TypeError(`no container for run ${number}`);
    return container;
};

export const eventsOf = <T extends StudioEventType>(received: StudioEvent[], type: T): Array<StudioEventOf<T>> => {
    return received.filter((event): event is StudioEventOf<T> => event.type === type);
};

export const statesOf = (received: StudioEvent[], simulation: Simulation): RunState[] => {
    const states = eventsOf(received, 'run:updated')
        .filter(({ run }) => run.simulationId === simulation.id)
        .map(({ run }) => run.state);

    return states.filter((state, index) => state !== states[index - 1]);
};
