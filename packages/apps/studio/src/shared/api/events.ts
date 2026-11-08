import { EVENTS_CHANNEL, StudioEvent, StudioEventOf, StudioEventType } from '@lammps-studio/contracts/events/gateway';
import { agentEndpoint } from '@/shared/config/agent';
import { useConnectionStore } from '@/shared/store/connection';

type Listener = (frame: StudioEvent) => void;

const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;
const OFFLINE_GRACE_MS = 4000;

const listeners = new Set<Listener>();
const connectHandlers = new Set<() => void>();

let socket: WebSocket | null = null;
let attempts = 0;
let graceTimer: ReturnType<typeof setTimeout> | null = null;

const isOfType = <T extends StudioEventType>(frame: StudioEvent, type: T): frame is StudioEventOf<T> => frame.type === type;

const backoffDelay = (): number => {
    const ceiling = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** attempts);

    return ceiling / 2 + Math.random() * (ceiling / 2);
};

const channelUrl = (url: string, token: string): string =>
    `${url.replace(/^http/, 'ws').replace(/\/+$/, '')}${EVENTS_CHANNEL}?token=${encodeURIComponent(token)}`;

const startGrace = () => {
    if(graceTimer !== null) return;

    graceTimer = setTimeout(() => {
        graceTimer = null;
        useConnectionStore.getState().setStatus('offline');
    }, OFFLINE_GRACE_MS);
};

const endGrace = () => {
    if(graceTimer !== null) clearTimeout(graceTimer);
    graceTimer = null;
};

const onOpen = () => {
    attempts = 0;
    endGrace();
    useConnectionStore.getState().setStatus('online');
    connectHandlers.forEach((handler) => handler());
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

    startGrace();
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

export const onConnect = (handler: () => void): (() => void) => {
    connectHandlers.add(handler);

    return () => {
        connectHandlers.delete(handler);
    };
};
