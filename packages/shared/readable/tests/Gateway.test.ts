import Application from '../lib/http/Application';
import BaseGateway from '../lib/gateway/BaseGateway';
import { InboundFrame, OutboundFrame } from '../lib/contracts/gateway';
import { Channel } from '../lib/decorators/gateway/Channel';
import { OnMessage } from '../lib/decorators/gateway/Gateway';
import { Payload } from '../lib/decorators/gateway/Params';
import { defineErrors } from '../lib/utils/errors/define-errors';
import { WebSocket } from '@fastify/websocket';
import { afterAll, describe, expect, it } from 'vitest';

interface Listener{
    socket: WebSocket;
    received: unknown[];
}

interface Echoed{
    echoed: unknown;
}

const TOKEN = 'probe-token';
const CHANNEL = '/probe';

const ProbeError = defineErrors({
    domain: 'Probe',
    causes: {
        Gone: 410
    }
});

const mounted: ProbeGateway[] = [];

@Channel(CHANNEL)
class ProbeGateway extends BaseGateway{
    constructor(){
        super();
        mounted.push(this);
    }

    @OnMessage('probe.echo')
    echo(@Payload() frame: InboundFrame): Echoed{
        return { echoed: frame.word };
    }

    @OnMessage('probe.fail')
    fail(){
        throw ProbeError.Gone();
    }

    shout(frame: OutboundFrame){
        this.connections.broadcast(frame);
    }

    get listeners(): number{
        return this.connections.size;
    }
}

const application = new Application({
    host: '127.0.0.1',
    port: 0,
    token: TOKEN,
    corsOrigins: [],
    log: { level: 'silent' },
    discover: async () => ({ controllers: [], gateways: [ProbeGateway] })
});

const app = await application.build();
await app.ready();

const listen = async (): Promise<Listener> => {
    const received: unknown[] = [];
    const socket = await app.injectWS(`${CHANNEL}?token=${TOKEN}`, {}, {
        onInit: (ws) => ws.on('message', (raw) => received.push(JSON.parse(String(raw))))
    });

    return {
        socket,
        received
    };
};

describe('BaseGateway', () => {
    afterAll(() => application.stop());

    it('refuses an upgrade without the token', async () => {
        await expect(app.injectWS(CHANNEL)).rejects.toThrow('401');
    });

    it('answers a message with what its handler returns', async () => {
        const listener = await listen();

        listener.socket.send(JSON.stringify({ type: 'probe.echo', word: 'hi' }));

        await expect.poll(() => listener.received).toEqual([{ type: 'probe.echo', data: { echoed: 'hi' } }]);
        listener.socket.terminate();
    });

    it('answers a frame it cannot route with the gateway error', async () => {
        const listener = await listen();

        listener.socket.send('not json');
        listener.socket.send(JSON.stringify({ type: 'probe.unknown' }));
        listener.socket.send(JSON.stringify({ type: 'probe.fail' }));

        await expect.poll(() => listener.received).toEqual([
            { error: 'Gateway::MalformedFrame' },
            { error: 'Gateway::UnknownMessageType' },
            { error: 'Probe::Gone' }
        ]);
        listener.socket.terminate();
    });

    it('broadcasts to every open socket and forgets a closed one', async () => {
        const gateway = mounted[0];
        const open = await listen();
        const closed = await listen();
        await expect.poll(() => gateway.listeners).toBe(2);

        closed.socket.terminate();
        await expect.poll(() => gateway.listeners).toBe(1);
        gateway.shout({ type: 'probe.shout' });

        await expect.poll(() => open.received).toEqual([{ type: 'probe.shout' }]);
        expect(closed.received).toEqual([]);
        open.socket.terminate();
    });
});
