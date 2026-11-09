import Application from '@lammps-studio/readable/http/Application';
import ModuleDiscovery from '@lammps-studio/readable/services/ModuleDiscovery';
import LammpsRuntime from '@lammps-studio/runtime/public/LammpsRuntime';
import { config } from '@/config';
import { builds } from '@/modules/builds/services/Build';
import { codeServer } from '@/modules/editor/services/CodeServer';
import { runSupervisor } from '@/modules/runs/services/RunSupervisor';
import { logger } from '@lammps-studio/readable/utils/Logger';
import { modules } from './modules';
import { mkdir } from 'node:fs/promises';

export type RuntimeFactory = () => LammpsRuntime;

const dockerRuntime: RuntimeFactory = () => new LammpsRuntime({ logger: logger.raw.child({ scope: 'runtime' }) });

const createApp = (openRuntime: RuntimeFactory = dockerRuntime) => new Application({
    host: config.host,
    port: config.port,
    token: config.token,
    corsOrigins: [...config.corsOrigins],
    log: config.log,
    discover: () => ModuleDiscovery.load(modules),
    beforeMount: async () => {
        await mkdir(config.simulationsDir, { recursive: true });
        const runtime = openRuntime();
        await builds.open(runtime);
        await runSupervisor.open(runtime);
    },
    onClose: async () => {
        await runSupervisor.close();
        builds.close();
        await codeServer.closeAll();
    }
});

export default createApp;
