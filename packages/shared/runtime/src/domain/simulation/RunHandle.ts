import type { RunID, RunState } from '../shared/types';
import type { RuntimeEvent, RuntimeEventMap } from '../observability/EventMap';
import type { RunSnapshot } from './RunSnapshot';
import type { EventBusPort } from '../../ports/EventBusPort';

const FINAL_STATES = new Set<RunState>(['completed', 'failed', 'cancelled']);

export default class RunHandle{
    constructor(
        public readonly runId: RunID,
        private readonly eventBus: EventBusPort<RuntimeEventMap>,
        private readonly snapshotProvider: () => Promise<RunSnapshot | null>,
        private readonly stopCommand: () => Promise<RunSnapshot>,
        private readonly killCommand: () => Promise<RunSnapshot>
    ){}

    on<K extends RuntimeEvent>(event: K, handler: (payload: RuntimeEventMap[K]) => void): () => void{
        return this.eventBus.on(event, (payload) => {
            if(this.belongsToThisRun(payload)){
                handler(payload);
            }
        });
    }

    once<K extends RuntimeEvent>(event: K, handler: (payload: RuntimeEventMap[K]) => void): () => void{
        const unsubscribe = this.on(event, (payload) => {
            unsubscribe();
            handler(payload);
        });

        return unsubscribe;
    }

    async snapshot(): Promise<RunSnapshot | null>{
        return await this.snapshotProvider();
    }

    async stop(): Promise<RunSnapshot>{
        return await this.stopCommand();
    }

    async kill(): Promise<RunSnapshot>{
        return await this.killCommand();
    }

    async waitForEnd(): Promise<RunSnapshot | null>{
        let unsubscribe = () => {};
        const ended = new Promise<RunSnapshot>((resolve) => {
            unsubscribe = this.once('simulation:end', ({ snapshot }) => resolve(snapshot));
        });

        const current = await this.snapshot();
        if(current && FINAL_STATES.has(current.state)){
            unsubscribe();
            return current;
        }

        return await ended;
    }

    private belongsToThisRun(payload: unknown): boolean{
        if(typeof payload !== 'object' || payload === null || !('runId' in payload)){
            return false;
        }

        return payload.runId === this.runId;
    }
}
