import { del, get, patch, post } from '../shared/routing';
import { EntryCandidate, ScriptInfo } from '../script/domain';
import { Simulation } from './domain';
import { CreateSimulationInput, UpdateSimulationInput } from './http';

export const simulationRoutes = {
    list: get<Simulation[]>('/simulations'),
    create: post<CreateSimulationInput, Simulation>('/simulations'),
    get: get<Simulation>('/simulations/:simulationId'),
    update: patch<UpdateSimulationInput, Simulation>('/simulations/:simulationId'),
    remove: del('/simulations/:simulationId'),
    duplicate: post<never, Simulation>('/simulations/:simulationId/duplicate'),
    script: get<ScriptInfo>('/simulations/:simulationId/script'),
    entryCandidates: get<EntryCandidate[]>('/simulations/:simulationId/entry-candidates'),
    preview: get<ArrayBuffer>('/simulations/:simulationId/preview')
};
