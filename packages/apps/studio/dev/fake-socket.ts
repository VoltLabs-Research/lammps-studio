import { createHash } from 'node:crypto';
import { IncomingMessage } from 'node:http';
import { Duplex } from 'node:stream';
import { StudioEvent } from '@lammps-studio/contracts/events/gateway';

const HANDSHAKE_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const FIN_TEXT = 0x81;
const FIN_CLOSE = 0x88;
const OPCODE_MASK = 0x0f;
const OPCODE_CLOSE = 0x8;
const SHORT_LENGTH = 126;
const MEDIUM_LENGTH = 65_536;
const LONG_MARKER = 127;

const clients = new Set<Duplex>();

const frameOf = (text: string): Buffer => {
    const payload = Buffer.from(text);
    if(payload.length < SHORT_LENGTH) return Buffer.concat([Buffer.from([FIN_TEXT, payload.length]), payload]);

    if(payload.length < MEDIUM_LENGTH){
        const header = Buffer.from([FIN_TEXT, SHORT_LENGTH, 0, 0]);
        header.writeUInt16BE(payload.length, 2);

        return Buffer.concat([header, payload]);
    }

    const header = Buffer.alloc(10);
    header[0] = FIN_TEXT;
    header[1] = LONG_MARKER;
    header.writeBigUInt64BE(BigInt(payload.length), 2);

    return Buffer.concat([header, payload]);
};

export const acceptSocket = (request: IncomingMessage, socket: Duplex) => {
    const accept = createHash('sha1').update(`${request.headers['sec-websocket-key']}${HANDSHAKE_GUID}`).digest('base64');
    socket.write([
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        '',
        ''
    ].join('\r\n'));

    clients.add(socket);
    socket.on('data', (chunk: Buffer) => {
        if((chunk[0] & OPCODE_MASK) === OPCODE_CLOSE) socket.end(Buffer.from([FIN_CLOSE, 0]));
    });
    socket.on('close', () => clients.delete(socket));
    socket.on('error', () => clients.delete(socket));
};

export const broadcast = (event: StudioEvent) => {
    const frame = frameOf(JSON.stringify(event));
    clients.forEach((client) => client.write(frame));
};
