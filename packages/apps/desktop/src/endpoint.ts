import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { AddressInfo, createServer } from 'node:net';
import { AgentEndpoint } from '@lammps-studio/contracts/desktop/bridge';
import { LOOPBACK } from './config';

const TOKEN_BYTES = 32;

const reservePort = async (): Promise<number> => {
    const server = createServer().listen(0, LOOPBACK);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    server.close();
    await once(server, 'close');
    return port;
};

export const reserveEndpoint = async (): Promise<AgentEndpoint> => {
    return {
        url: `http://${LOOPBACK}:${await reservePort()}`,
        token: randomBytes(TOKEN_BYTES).toString('base64url')
    };
};
