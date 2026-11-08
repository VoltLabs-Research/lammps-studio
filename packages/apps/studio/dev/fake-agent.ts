import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { AGENT_READY_PREFIX } from '@lammps-studio/contracts/desktop/bridge';
import { EVENTS_CHANNEL } from '@lammps-studio/contracts/events/gateway';
import { RequestErrors } from '@lammps-studio/contracts/shared/errors';
import { createState } from './fake-data';
import { fail, Failure, matchRoute } from './fake-router';
import { routesFor } from './fake-routes';
import { acceptSocket } from './fake-socket';
import { startTicker } from './fake-ticker';

const HOST = '127.0.0.1';
const PORT = 4100;
const TOKEN = 'dev';
const ORIGIN = `http://${HOST}:${PORT}`;
const VERSION = '0.0.0-fake';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
};

const state = createState();
const routes = routesFor(state);

const send = (response: ServerResponse, status: number, body?: object) => {
    if(body === undefined){
        response.writeHead(status, CORS_HEADERS).end();
        return;
    }

    response.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(body));
};

const readBody = async (request: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of request){
        chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('utf8');
};

const reply = (response: ServerResponse, result: unknown) => {
    if(result instanceof Failure){
        send(response, result.status, { error: result.code });
        return;
    }

    if(result === undefined){
        send(response, 204);
        return;
    }

    send(response, 200, { data: result });
};

const handle = async (request: IncomingMessage, response: ServerResponse) => {
    if(request.method === 'OPTIONS'){
        send(response, 204);
        return;
    }

    if(request.headers.authorization !== `Bearer ${TOKEN}`){
        reply(response, fail(RequestErrors, 'Unauthorized'));
        return;
    }

    const url = new URL(request.url ?? '/', ORIGIN);
    const match = matchRoute(routes, request.method ?? 'GET', url.pathname);
    if(!match){
        send(response, 404, { error: 'Route::NotFound' });
        return;
    }

    reply(response, match.route.handle(match.params, await readBody(request)));
};

const server = createServer((request, response) => void handle(request, response));

server.on('upgrade', (request, socket) => {
    const url = new URL(request.url ?? '/', ORIGIN);
    if(url.pathname !== EVENTS_CHANNEL || url.searchParams.get('token') !== TOKEN){
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return;
    }

    acceptSocket(request, socket);
});

server.listen(PORT, HOST, () => {
    console.log(`${AGENT_READY_PREFIX}${JSON.stringify({ url: ORIGIN, token: TOKEN, version: VERSION })}`);
});

if(process.env.FAKE_AGENT_STILL !== '1') startTicker(state);
