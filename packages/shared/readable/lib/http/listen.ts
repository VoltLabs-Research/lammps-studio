import { logger } from '../utils/Logger';

export interface ListenTarget{
    start(): Promise<string>;
    stop(): Promise<void>;
}

export type ListeningHandler = (url: string) => void;

const start = async (app: ListenTarget, listening: ListeningHandler) => {
    try{
        listening(await app.start());
    }catch(error: unknown){
        logger.error('Failed to start server', error);
        process.exit(1);
    }
};

export const listen = (app: ListenTarget, listening: ListeningHandler) => {
    void start(app, listening);

    for(const signal of ['SIGTERM', 'SIGINT'] as const){
        process.on(signal, () => {
            app.stop().finally(() => process.exit(0));
        });
    }
};
