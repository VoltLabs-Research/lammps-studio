import { config } from '@/config';
import { EVENTS_CHANNEL } from '@lammps-studio/contracts/events/gateway';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { startAgent } from '@tests/harness';
import { describe, expect, it } from 'vitest';

const DEV_STUDIO_ORIGIN = 'http://localhost:5180';
const PACKAGED_WINDOW_ORIGIN = 'file://';

const app = await startAgent();

describe('the origins studio calls from', () => {
    it('answers the preflight the dev studio sends for the authorization header', async () => {
        const res = await app.inject({
            method: 'OPTIONS',
            url: simulationRoutes.list.path,
            headers: {
                origin: DEV_STUDIO_ORIGIN,
                'access-control-request-method': 'GET',
                'access-control-request-headers': 'authorization'
            }
        });

        expect(res.statusCode).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe(DEV_STUDIO_ORIGIN);
        expect(res.headers['access-control-allow-headers']).toBe('authorization');
    });

    it('accepts the events upgrade from the packaged window', async () => {
        const socket = await app.injectWS(`${EVENTS_CHANNEL}?token=${config.token}`, { headers: { origin: PACKAGED_WINDOW_ORIGIN } });

        expect(socket.readyState).toBe(socket.OPEN);
        socket.terminate();
    });
});
