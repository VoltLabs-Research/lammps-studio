import { Build } from '@lammps-studio/contracts/build/domain';
import { buildRoutes } from '@lammps-studio/contracts/build/routes';
import { BuildErrors } from '@lammps-studio/contracts/build/errors';
import { CreateBuildInput } from '@lammps-studio/contracts/build/http';
import { machineRoutes } from '@lammps-studio/contracts/machine/routes';
import { MachineErrors } from '@lammps-studio/contracts/machine/errors';
import { SimulationTemplate } from '@lammps-studio/contracts/simulation/domain';
import { SimulationErrors } from '@lammps-studio/contracts/simulation/errors';
import { CreateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { FakeState } from './fake-state';
import { randomHash, slugOf, withRun } from './fake-helpers';
import { fail, Failure, route, Route } from './fake-router';
import { broadcast } from './fake-socket';

const entryFor = (template: SimulationTemplate, source: string | null): string | null => {
    if(template === 'empty') return 'main.in';
    if(template === 'example') return `in.${source}`;

    return null;
};

const createSimulation = (state: FakeState, input: CreateSimulationInput) => {
    const machine = state.machines.find((item) => item.id === input.machineId);
    if(!machine) return fail(MachineErrors, 'NotFound');
    if(machine.status === 'offline') return fail(MachineErrors, 'Offline');
    if(state.simulations.some((item) => item.machineId === machine.id && item.name === input.name)) return fail(SimulationErrors, 'NameTaken');

    const now = new Date().toISOString();
    const id = slugOf(input.name, state.simulations.map((item) => item.id));
    const simulation = {
        id,
        name: input.name,
        machineId: machine.id,
        folder: id,
        entry: entryFor(input.template, input.source),
        createdAt: now,
        updatedAt: now,
        lastRun: null,
        hasPreview: false
    };
    state.simulations = [...state.simulations, simulation];
    broadcast({ type: 'simulation:updated', simulation });

    return simulation;
};

const duplicateSimulation = (state: FakeState, simulationId: string) => {
    const original = state.simulations.find((item) => item.id === simulationId);
    if(!original) return fail(SimulationErrors, 'NotFound');

    const copy = createSimulation(state, { name: `${original.name} copy`, machineId: original.machineId, template: 'empty', source: null });
    if(!(copy instanceof Failure)) state.folders.set(copy.id, state.folders.get(original.id) ?? []);

    return copy;
};

const removeSimulation = (state: FakeState, simulationId: string): Failure | undefined => {
    if(!state.simulations.some((item) => item.id === simulationId)) return fail(SimulationErrors, 'NotFound');

    state.simulations = state.simulations.filter((item) => item.id !== simulationId);
    state.runs.delete(simulationId);
    state.folders.delete(simulationId);
    broadcast({ type: 'simulation:removed', simulationId });

    return undefined;
};

const createBuild = (state: FakeState, input: CreateBuildInput) => {
    const machine = state.machines.find((item) => item.id === input.machineId);
    if(!machine) return fail(MachineErrors, 'NotFound');
    if(machine.status === 'offline') return fail(MachineErrors, 'Offline');

    const hash = randomHash();
    const build: Build = {
        hash,
        machineId: machine.id,
        version: input.version,
        packages: input.packages,
        image: `lammps/lammps-runtime:${hash}`,
        sizeBytes: null,
        status: 'building',
        progress: 0,
        steps: [],
        output: null,
        buildSeconds: null,
        usedBy: 0,
        createdAt: new Date().toISOString()
    };
    state.builds = [...state.builds, build];
    broadcast({ type: 'build:updated', build });

    return build;
};

const removeBuild = (state: FakeState, hash: string): Failure | undefined => {
    const build = state.builds.find((item) => item.hash === hash);
    if(!build) return fail(BuildErrors, 'NotFound');
    if(build.usedBy > 0) return fail(BuildErrors, 'InUse');

    state.builds = state.builds.filter((item) => item.hash !== hash);

    return undefined;
};

export const routesFor = (state: FakeState): Route[] => [
    route(simulationRoutes.list, () => state.simulations.map((simulation) => withRun(state, simulation))),
    route(simulationRoutes.get, ({ simulationId }) => {
        const simulation = state.simulations.find((item) => item.id === simulationId);

        return simulation ? withRun(state, simulation) : fail(SimulationErrors, 'NotFound');
    }),
    route(simulationRoutes.create, (_, body) => createSimulation(state, body)),
    route(simulationRoutes.duplicate, ({ simulationId }) => duplicateSimulation(state, simulationId)),
    route(simulationRoutes.remove, ({ simulationId }) => removeSimulation(state, simulationId)),
    route(machineRoutes.list, () => state.machines),
    route(machineRoutes.get, ({ machineId }) => state.machines.find((item) => item.id === machineId) ?? fail(MachineErrors, 'NotFound')),
    route(buildRoutes.list, () => state.builds),
    route(buildRoutes.create, (_, body) => createBuild(state, body)),
    route(buildRoutes.get, ({ hash }) => state.builds.find((item) => item.hash === hash) ?? fail(BuildErrors, 'NotFound')),
    route(buildRoutes.remove, ({ hash }) => removeBuild(state, hash))
];
