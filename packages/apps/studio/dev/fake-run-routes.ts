import { RunErrors } from '@lammps-studio/contracts/run/errors';
import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { SimulationErrors } from '@lammps-studio/contracts/simulation/errors';
import { encodeFrame } from '@lammps-studio/lammps/dump/frame-codec';
import { cuFrame } from './cu/cu-frame';
import { withSimulation } from './fake-helpers';
import { startRun, stopRun } from './fake-run-control';
import { fail, Failure, Params, route, Route } from './fake-router';
import { RunRecord } from './fake-runs';
import { FakeState, findRecord, recordsOf } from './fake-state';

const withRecord = <T>(state: FakeState, { simulationId, runNumber }: Params, read: (record: RunRecord) => T): T | Failure => {
    const record = findRecord(state, simulationId, runNumber);
    if(!record) return fail(RunErrors, 'NotFound');

    return read(record);
};

const listRuns = (state: FakeState, simulationId: string) => {
    if(!state.simulations.some((simulation) => simulation.id === simulationId)) return fail(SimulationErrors, 'NotFound');

    return recordsOf(state, simulationId).map((record) => record.run);
};

const frameBytes = (record: RunRecord, frameIndex: string): ArrayBuffer | Failure => {
    const frame = record.frames.find((info) => String(info.index) === frameIndex);
    if(!frame) return fail(RunErrors, 'FrameNotFound');

    return encodeFrame(cuFrame(frame.step));
};

export const runRoutesFor = (state: FakeState): Route[] => [
    route(runRoutes.list, ({ simulationId }) => listRuns(state, simulationId)),
    route(runRoutes.start, ({ simulationId }, body) => withSimulation(state, simulationId, (simulation) => startRun(state, simulation, body))),
    route(runRoutes.get, (params) => withRecord(state, params, (record) => record.run)),
    route(runRoutes.stop, (params, body) => withRecord(state, params, (record) => stopRun(state, record, body))),
    route(runRoutes.log, (params) => withRecord(state, params, (record) => record.log)),
    route(runRoutes.thermo, (params) => withRecord(state, params, (record) => record.reader.sections)),
    route(runRoutes.frames, (params) => withRecord(state, params, (record) => record.frames)),
    route(runRoutes.frame, (params) => withRecord(state, params, (record) => frameBytes(record, params.frameIndex)))
];
