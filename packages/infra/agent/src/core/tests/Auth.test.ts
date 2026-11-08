import { editorRoutes } from '@lammps-studio/contracts/editor/routes';
import { fileRoutes } from '@lammps-studio/contracts/file/routes';
import { machineRoutes } from '@lammps-studio/contracts/machine/routes';
import { Endpoint } from '@lammps-studio/contracts/shared/routing';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { startAgent } from '@tests/harness';
import { describe, expect, it } from 'vitest';

const ROUTE_PARAM = /:\w+/g;

const app = await startAgent();

const endpoints: Endpoint<never, unknown>[] = [
    ...Object.values(machineRoutes),
    ...Object.values(simulationRoutes),
    ...Object.values(fileRoutes),
    ...Object.values(editorRoutes)
];

describe('the bearer token', () => {
    it.each(endpoints)('guards $method $path', async (endpoint) => {
        const res = await app.inject({
            method: endpoint.method,
            url: endpoint.path.replace(ROUTE_PARAM, 'local')
        });

        expect(res.statusCode).toBe(401);
        expect(res.json()).toEqual({ error: 'Request::Unauthorized' });
    });
});
