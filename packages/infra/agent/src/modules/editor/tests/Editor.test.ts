import createApp from '@/core/Application';
import { config } from '@/config';
import { editorRoutes } from '@lammps-studio/contracts/editor/routes';
import { startAgent } from '@tests/harness';
import { expectError, request } from '@tests/request';
import { createSimulation, folderOf } from '@tests/simulations';
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const START_TIMEOUT_MS = 60_000;

const app = await startAgent();

describe.skipIf(!existsSync(config.codeServer.command))('EditorController', { timeout: START_TIMEOUT_MS }, () => {
    it('opens the simulation folder in a code-server bound to loopback, started once', async () => {
        const simulation = await createSimulation(app, { name: 'Edited' });

        const first = await request(app, editorRoutes.open, { params: { simulationId: simulation.id } });
        const second = await request(app, editorRoutes.open, { params: { simulationId: simulation.id } });

        expect(first.status).toBe(200);
        const url = new URL(first.data().url);
        expect(url.hostname).toBe('127.0.0.1');
        expect(url.searchParams.get('folder')).toBe(folderOf(simulation));
        expect(second.data().url).toBe(first.data().url);
        expect((await fetch(url)).status).toBe(200);
    });

    it('runs one code-server per simulation', async () => {
        const left = await createSimulation(app, { name: 'Left' });
        const right = await createSimulation(app, { name: 'Right' });

        const leftUrl = new URL((await request(app, editorRoutes.open, { params: { simulationId: left.id } })).data().url);
        const rightUrl = new URL((await request(app, editorRoutes.open, { params: { simulationId: right.id } })).data().url);

        expect(leftUrl.port).not.toBe(rightUrl.port);
    });

    it('answers 404 for a simulation that does not exist', async () => {
        expectError(await request(app, editorRoutes.open, { params: { simulationId: 'missing' } }), 404, 'Simulation::NotFound');
    });

    it('stops every code-server when the agent stops', async () => {
        const application = createApp();
        const stopping = await application.build();
        const simulation = await createSimulation(stopping, { name: 'Closed' });
        const url = (await request(stopping, editorRoutes.open, { params: { simulationId: simulation.id } })).data().url;

        await application.stop();

        await expect(fetch(url)).rejects.toThrow();
    });
});
