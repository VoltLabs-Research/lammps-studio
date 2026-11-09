import { FileErrors } from '@lammps-studio/contracts/file/errors';
import { fileRoutes } from '@lammps-studio/contracts/file/routes';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { SimulationErrors } from '@lammps-studio/contracts/simulation/errors';
import { entriesIn, FakeFile, folderPath, isUnder } from './fake-folders';
import { withRun } from './fake-helpers';
import { fail, Failure, Params, route, Route } from './fake-router';
import { broadcast } from './fake-socket';
import { FakeState, filesOf, recordsOf } from './fake-state';

const encoder = new TextEncoder();

const located = <T>(state: FakeState, { simulationId, path = '' }: Params, read: (simulation: Simulation, relative: string) => T): T | Failure => {
    const simulation = state.simulations.find((item) => item.id === simulationId);
    if(!simulation) return fail(SimulationErrors, 'NotFound');

    const relative = folderPath(path);
    if(relative === null) return fail(FileErrors, 'OutsideFolder');

    return read(simulation, relative);
};

const bytesOf = (file: FakeFile): ArrayBuffer => {
    if(file.text === null) return new ArrayBuffer(file.sizeBytes);

    return encoder.encode(file.text).buffer;
};

const download = (state: FakeState, simulationId: string, path: string): ArrayBuffer | Failure => {
    const file = filesOf(state, simulationId).find((candidate) => candidate.path === path);
    if(!file) return fail(FileErrors, 'NotFound');

    return bytesOf(file);
};

const remove = (state: FakeState, simulation: Simulation, path: string): Failure | undefined => {
    if(path === '') return fail(FileErrors, 'OutsideFolder');
    if(!filesOf(state, simulation.id).some((file) => isUnder(file.path, path))) return fail(FileErrors, 'NotFound');

    state.removed.set(simulation.id, [...(state.removed.get(simulation.id) ?? []), path]);
    const runs = recordsOf(state, simulation.id);
    const kept = runs.filter((record) => !isUnder(record.run.outputDir, path));
    if(kept.length === runs.length) return undefined;

    state.runs.set(simulation.id, kept);
    broadcast({ type: 'simulation:updated', simulation: withRun(state, simulation) });

    return undefined;
};

const list = (state: FakeState, simulationId: string, path: string) => entriesIn(filesOf(state, simulationId), path) ?? fail(FileErrors, 'NotFound');

export const fileRoutesFor = (state: FakeState): Route[] => [
    route(fileRoutes.list, (params) => located(state, params, (simulation, path) => list(state, simulation.id, path))),
    route(fileRoutes.download, (params) => located(state, params, (simulation, path) => download(state, simulation.id, path))),
    route(fileRoutes.remove, (params) => located(state, params, (simulation, path) => remove(state, simulation, path)))
];
