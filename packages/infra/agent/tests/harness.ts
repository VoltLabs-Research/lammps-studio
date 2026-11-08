import Application from '@lammps-studio/readable/http/Application';
import createApp from '@/core/Application';
import { afterAll } from 'vitest';

export type AgentApp = Awaited<ReturnType<Application['build']>>;

export const startAgent = async (): Promise<AgentApp> => {
    const application = createApp();
    const app = await application.build();
    await app.ready();
    afterAll(() => application.stop());

    return app;
};
