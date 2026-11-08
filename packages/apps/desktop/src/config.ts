import { app } from 'electron';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEV_STUDIO_URL } from './studio';

const DEV_AGENT_ENTRY = 'src/server.ts';

export const LOOPBACK = '127.0.0.1';

const packaged = () => {
    return {
        studioUrl: pathToFileURL(join(process.resourcesPath, 'studio', 'index.html')).href,
        agent: {
            cwd: process.resourcesPath,
            args: [join(process.resourcesPath, 'agent.cjs')]
        }
    };
};

const local = () => {
    const agentDir = join(app.getAppPath(), '..', '..', 'infra', 'agent');
    const viteNode = createRequire(join(agentDir, 'package.json')).resolve('vite-node/cli');
    return {
        studioUrl: DEV_STUDIO_URL,
        agent: {
            cwd: agentDir,
            args: [viteNode, DEV_AGENT_ENTRY]
        }
    };
};

export const config = app.isPackaged ? packaged() : local();
