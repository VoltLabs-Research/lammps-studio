import { eventBus } from '@/shared/events/EventBus';
import { EVENTS_CHANNEL, SimulationRemovedFrame } from '@lammps-studio/contracts/events/gateway';
import { listenToEvents } from '@tests/events';
import { startAgent } from '@tests/harness';
import { describe, expect, it } from 'vitest';

const app = await startAgent();

describe('EventsGateway', () => {
    it('refuses a client without the token', async () => {
        await expect(app.injectWS(EVENTS_CHANNEL)).rejects.toThrow('401');
    });

    it('broadcasts every published frame to every client', async () => {
        const first = await listenToEvents(app);
        const second = await listenToEvents(app);
        const removed: SimulationRemovedFrame = {
            type: 'simulation:removed',
            simulationId: 'gone'
        };

        eventBus.emit(removed);

        await expect.poll(() => first.received).toEqual([removed]);
        await expect.poll(() => second.received).toEqual([removed]);
        first.socket.terminate();
        second.socket.terminate();
    });
});
