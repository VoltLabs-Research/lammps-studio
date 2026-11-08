import { logger } from '../utils/Logger';
import { fstatSync } from 'node:fs';

export interface ListenTarget{
    start(): Promise<string>;
    stop(): Promise<void>;
}

export type ListeningHandler = (url: string) => void;

const SHUTDOWN_SIGNALS = ['SIGTERM', 'SIGINT'] as const;
const STDIN = 0;

const start = async (app: ListenTarget, listening: ListeningHandler) => {
    try{
        listening(await app.start());
    }catch(error: unknown){
        logger.error('Failed to start server', error);
        process.exit(1);
    }
};

const stdinIsPiped = (): boolean => {
    const stdin = fstatSync(STDIN);
    return stdin.isFIFO() || stdin.isSocket();
};

export const listen = (app: ListenTarget, listening: ListeningHandler) => {
    let stopping = false;
    const shutdown = () => {
        if(stopping) return;

        stopping = true;
        app.stop().finally(() => process.exit(0));
    };

    void start(app, listening);

    for(const signal of SHUTDOWN_SIGNALS){
        process.on(signal, shutdown);
    }

    if(stdinIsPiped()){
        process.stdin.on('end', shutdown);
        process.stdin.resume();
    }
};
