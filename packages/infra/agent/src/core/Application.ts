import Application from '@lammps-studio/readable/http/Application';
import ModuleDiscovery from '@lammps-studio/readable/services/ModuleDiscovery';
import { config } from '@/config';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const MODULES_DIR = fileURLToPath(new URL('../modules', import.meta.url));

const createApp = () => new Application({
    host: config.host,
    port: config.port,
    token: config.token,
    corsOrigins: [...config.corsOrigins],
    log: config.log,
    discover: () => new ModuleDiscovery(MODULES_DIR).discover(),
    beforeMount: async () => {
        await mkdir(config.simulationsDir, { recursive: true });
    }
});

export default createApp;
