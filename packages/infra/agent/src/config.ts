import agentPackage from '../package.json';
import { optionalEnv } from '@lammps-studio/readable/utils/env';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

const TOKEN_BYTES = 32;
const LOOPBACK = '127.0.0.1';
const STUDIO_DEV_ORIGIN = 'http://localhost:5180';
const ELECTRON_FILE_ORIGIN = 'null';

const root = optionalEnv('LAMMPS_STUDIO_ROOT') ?? join(homedir(), 'lammps-studio');

export const config = {
    version: agentPackage.version,
    host: LOOPBACK,
    port: Number(optionalEnv('LAMMPS_AGENT_PORT') ?? 0),
    token: optionalEnv('LAMMPS_AGENT_TOKEN') ?? randomBytes(TOKEN_BYTES).toString('hex'),
    corsOrigins: [STUDIO_DEV_ORIGIN, ELECTRON_FILE_ORIGIN],
    log: {
        level: optionalEnv('LOG_LEVEL') ?? 'info'
    },
    root,
    simulationsDir: join(root, 'simulations'),
    codeServer: {
        command: optionalEnv('LAMMPS_CODE_SERVER') ?? join(homedir(), '.local', 'bin', 'code-server'),
        userDataDir: join(root, '.code-server')
    }
} as const;
