import { config } from '@/config';
import { EVENTS_CHANNEL, StudioEvent } from '@lammps-studio/contracts/events/gateway';
import { AgentApp } from './harness';

export type EventSocket = Awaited<ReturnType<AgentApp['injectWS']>>;

export interface EventListener{
    socket: EventSocket;
    received: StudioEvent[];
}

export const listenToEvents = async (app: AgentApp): Promise<EventListener> => {
    const received: StudioEvent[] = [];
    const socket = await app.injectWS(`${EVENTS_CHANNEL}?token=${config.token}`, {}, {
        onInit: (ws) => ws.on('message', (raw) => received.push(JSON.parse(String(raw)) as StudioEvent))
    });

    return {
        socket,
        received
    };
};
