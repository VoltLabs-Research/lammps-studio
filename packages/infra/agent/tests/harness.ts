import Application from '@lammps-studio/readable/http/Application';
import createApp, { RuntimeFactory } from '@/core/Application';
import { afterAll } from 'vitest';

export type AgentApp = Awaited<ReturnType<Application['build']>>;

export interface StartedAgent{
    application: Application;
    app: AgentApp;
}

export const bootAgent = async (openRuntime?: RuntimeFactory): Promise<StartedAgent> => {
    const application = createApp(openRuntime);
    const app = await application.build();
    await app.ready();

    return {
        application,
        app
    };
};

export const startAgent = async (openRuntime?: RuntimeFactory): Promise<AgentApp> => {
    const { application, app } = await bootAgent(openRuntime);
    afterAll(() => application.stop());

    return app;
};
