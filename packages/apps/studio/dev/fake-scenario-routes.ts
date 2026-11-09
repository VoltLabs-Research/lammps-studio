import { RequestErrors } from '@lammps-studio/contracts/shared/errors';
import { get, post } from '@lammps-studio/contracts/shared/routing';
import { withRun } from './fake-helpers';
import { fail, route, Route } from './fake-router';
import { publishRecord } from './fake-run-events';
import { isScenario, Scenario } from './fake-scenarios';
import { broadcast } from './fake-socket';
import { createState, FakeState } from './fake-state';

interface ScenarioInput{
    scenario: Scenario;
    live?: boolean;
}

interface ScenarioStatus{
    scenario: Scenario;
    live: boolean;
}

const scenarioRoutes = {
    get: get<ScenarioStatus>('/dev/scenario'),
    set: post<unknown, ScenarioStatus>('/dev/scenario')
};

const isInput = (body: unknown): body is ScenarioInput => {
    if(typeof body !== 'object' || body === null || !('scenario' in body) || !isScenario(body.scenario)) return false;

    return !('live' in body) || typeof body.live === 'boolean';
};

const statusOf = ({ scenario, live }: FakeState): ScenarioStatus => ({ scenario, live });

const broadcastWorld = (state: FakeState, before: string[]) => {
    before
        .filter((simulationId) => !state.simulations.some((simulation) => simulation.id === simulationId))
        .forEach((simulationId) => broadcast({ type: 'simulation:removed', simulationId }));
    state.builds.forEach((build) => broadcast({ type: 'build:updated', build }));
    state.simulations.forEach((simulation) => broadcast({ type: 'simulation:updated', simulation: withRun(state, simulation) }));
    [...state.runs.values()].flat().forEach(publishRecord);
};

const applyScenario = (state: FakeState, { scenario, live = false }: ScenarioInput): ScenarioStatus => {
    const before = state.simulations.map((simulation) => simulation.id);
    Object.assign(state, createState(scenario, live));
    broadcastWorld(state, before);

    return statusOf(state);
};

export const scenarioRoutesFor = (state: FakeState): Route[] => [
    route(scenarioRoutes.get, () => statusOf(state)),
    route(scenarioRoutes.set, (_, body) => (isInput(body) ? applyScenario(state, body) : fail(RequestErrors, 'ValidationFailed')))
];
