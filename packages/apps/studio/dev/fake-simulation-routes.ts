import { RequestErrors } from '@lammps-studio/contracts/shared/errors';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { SimulationErrors } from '@lammps-studio/contracts/simulation/errors';
import { UpdateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { decimateFrame } from '@lammps-studio/lammps/dump/decimate-frame';
import { encodeFrame } from '@lammps-studio/lammps/dump/frame-codec';
import { analyseScript } from '@lammps-studio/lammps/script/analyse-script';
import { resolveEntry } from '@lammps-studio/lammps/script/resolve-entry';
import { cuFrame } from './cu/cu-frame';
import { folderPath, scriptFiles } from './fake-folders';
import { withRun, withSimulation } from './fake-helpers';
import { fail, Failure, route, Route } from './fake-router';
import { broadcast } from './fake-socket';
import { FakeState, filesOf, latestFrame } from './fake-state';

const PREVIEW_ATOMS = 10_000;

const scriptOf = (state: FakeState, { id, entry }: Simulation) => {
    const files = scriptFiles(filesOf(state, id));
    if(entry === null || !files.some((file) => file.path === entry)) return fail(SimulationErrors, 'NoEntryScript');

    return analyseScript(entry, files);
};

const entryOf = (state: FakeState, simulation: Simulation, requested: string | undefined): string | null | Failure => {
    if(requested === undefined) return simulation.entry;

    const entry = folderPath(requested);
    if(entry === null) return fail(SimulationErrors, 'EntryOutsideFolder');
    if(!filesOf(state, simulation.id).some((file) => file.path === entry)) return fail(SimulationErrors, 'NoEntryScript');

    return entry;
};

const nameOf = (state: FakeState, simulation: Simulation, requested: string | undefined): string | Failure => {
    if(requested === undefined) return simulation.name;

    const name = requested.trim();
    if(name === '') return fail(RequestErrors, 'ValidationFailed');
    if(state.simulations.some((other) => other.id !== simulation.id && other.machineId === simulation.machineId && other.name === name)) return fail(SimulationErrors, 'NameTaken');

    return name;
};

const updateSimulation = (state: FakeState, simulation: Simulation, input: UpdateSimulationInput) => {
    const name = nameOf(state, simulation, input.name);
    if(name instanceof Failure) return name;
    const entry = entryOf(state, simulation, input.entry);
    if(entry instanceof Failure) return entry;

    const updated: Simulation = { ...simulation, name, entry, updatedAt: new Date().toISOString() };
    state.simulations = state.simulations.map((item) => (item.id === updated.id ? updated : item));
    const published = withRun(state, updated);
    broadcast({ type: 'simulation:updated', simulation: published });

    return published;
};

const previewOf = (state: FakeState, simulationId: string): ArrayBuffer | Failure => {
    const frame = latestFrame(state, simulationId);
    if(!frame) return fail(SimulationErrors, 'NoPreview');

    return encodeFrame(decimateFrame(cuFrame(frame.step), PREVIEW_ATOMS));
};

export const simulationRoutesFor = (state: FakeState): Route[] => [
    route(simulationRoutes.update, ({ simulationId }, body) => withSimulation(state, simulationId, (simulation) => updateSimulation(state, simulation, body))),
    route(simulationRoutes.script, ({ simulationId }) => withSimulation(state, simulationId, (simulation) => scriptOf(state, simulation))),
    route(simulationRoutes.entryCandidates, ({ simulationId }) => withSimulation(state, simulationId, (simulation) => resolveEntry(scriptFiles(filesOf(state, simulation.id))))),
    route(simulationRoutes.preview, ({ simulationId }) => withSimulation(state, simulationId, (simulation) => previewOf(state, simulation.id)))
];
