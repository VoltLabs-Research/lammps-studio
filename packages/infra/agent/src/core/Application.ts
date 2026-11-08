import Application from '@lammps-studio/readable/http/Application';
import ModuleDiscovery from '@lammps-studio/readable/services/ModuleDiscovery';
import { config } from '@/config';
import { codeServer } from '@/modules/editor/services/CodeServer';
import { modules } from './modules';
import { mkdir } from 'node:fs/promises';

const createApp = () => new Application({
    host: config.host,
    port: config.port,
    token: config.token,
    corsOrigins: [...config.corsOrigins],
    log: config.log,
    discover: () => ModuleDiscovery.load(modules),
    beforeMount: async () => {
        await mkdir(config.simulationsDir, { recursive: true });
    },
    onClose: () => codeServer.closeAll()
});

export default createApp;
