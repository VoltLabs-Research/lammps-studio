import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { call, interpolatePath } from '@/shared/api/call';
import { ClientError } from '@/shared/errors/ClientError';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const AGENT_URL = 'http://127.0.0.1:4100';

const jsonResponse = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

describe('interpolatePath', () => {
    it('replaces every param and encodes it', () => {
        expect(interpolatePath('/runs/:simulationId/:runNumber', { simulationId: 'a b', runNumber: 3 })).toBe('/runs/a%20b/3');
    });

    it('throws when a param is missing', () => {
        expect(() => interpolatePath('/simulations/:simulationId')).toThrow('Agent::MissingPathParam');
    });
});

describe('call', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        vi.stubEnv('VITE_AGENT_URL', AGENT_URL);
        vi.stubEnv('VITE_AGENT_TOKEN', 'secret');
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    it('sends the bearer token and unwraps the data envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, { data: [{ id: 'cu' }] }));

        const simulations = await call(simulationRoutes.list);

        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toBe(`${AGENT_URL}/simulations`);
        expect(init?.headers).toEqual({ Authorization: 'Bearer secret' });
        expect(simulations).toEqual([{ id: 'cu' }]);
    });

    it('serialises the body as JSON', async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, { data: { id: 'new' } }));

        await call(simulationRoutes.create, { body: { name: 'LJ', machineId: 'local', template: 'empty', source: null } });

        const [, init] = fetchMock.mock.calls[0];
        expect(init?.method).toBe('POST');
        expect(init?.headers).toEqual({ Authorization: 'Bearer secret', 'Content-Type': 'application/json' });
        expect(JSON.parse(String(init?.body))).toEqual({ name: 'LJ', machineId: 'local', template: 'empty', source: null });
    });

    it('throws a client error carrying the wire code', async () => {
        fetchMock.mockResolvedValue(jsonResponse(409, { error: 'Simulation::NameTaken' }));

        const failure = await call(simulationRoutes.create, { body: { name: 'LJ', machineId: 'local', template: 'empty', source: null } })
            .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(ClientError);
        expect(failure).toMatchObject({ code: 'Simulation::NameTaken', status: 409 });
    });

    it('returns the bytes of a binary route', async () => {
        const bytes = new Uint8Array([1, 2, 3, 4]);
        fetchMock.mockResolvedValue(new Response(bytes, { status: 200, headers: { 'content-type': 'application/octet-stream' } }));

        const preview = await call(simulationRoutes.preview, { path: { simulationId: 'cu' } });

        expect(new Uint8Array(preview)).toEqual(bytes);
    });

    it('reports an unreachable agent', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        await expect(call(simulationRoutes.list)).rejects.toMatchObject({ code: 'Agent::Unreachable' });
    });
});
