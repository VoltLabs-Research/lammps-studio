import { EVENTS_CHANNEL, StudioEvent, StudioEventOf, StudioEventType } from '@lammps-studio/contracts/events/gateway';
import { agentEndpoint } from '@/shared/config/agent';

type Listener = (frame: StudioEvent) => void;

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;

const listeners = new Set<Listener>();
const reconnectHandlers = new Set<() => void>();

let socket: WebSocket | null = null;
let attempts = 0;
let hasOpened = false;

const isOfType = <T extends StudioEventType>(frame: StudioEvent, type: T): frame is StudioEventOf<T> => frame.type === type;

const backoffDelay = (): number => {
    const ceiling = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** attempts);

    return ceiling / 2 + Math.random() * (ceiling / 2);
};

const channelUrl = (url: string, token: string): string =>
    `${url.replace(/^http/, 'ws').replace(/\/+$/, '')}${EVENTS_CHANNEL}?token=${encodeURIComponent(token)}`;

const onOpen = () => {
    attempts = 0;
    if(hasOpened) reconnectHandlers.forEach((handler) => handler());
    hasOpened = true;
};

const onMessage = (event: MessageEvent<string>) => {
    const frame: StudioEvent = JSON.parse(event.data);
    listeners.forEach((listener) => listener(frame));
};

const onClose = () => {
    socket = null;
    const delay = backoffDelay();
    attempts += 1;
    setTimeout(connect, delay);
};

const connect = () => {
    const agent = agentEndpoint();
    if(socket || !agent) return;

    socket = new WebSocket(channelUrl(agent.url, agent.token));
    socket.addEventListener('open', onOpen);
    socket.addEventListener('message', onMessage);
    socket.addEventListener('close', onClose);
};

export const subscribe = <T extends StudioEventType>(type: T, handler: (frame: StudioEventOf<T>) => void): (() => void) => {
    const listener: Listener = (frame) => {
        if(isOfType(frame, type)) handler(frame);
    };
    listeners.add(listener);
    connect();

    return () => {
        listeners.delete(listener);
    };
};

export const onReconnect = (handler: () => void): (() => void) => {
    reconnectHandlers.add(handler);

    return () => {
        reconnectHandlers.delete(handler);
    };
};
