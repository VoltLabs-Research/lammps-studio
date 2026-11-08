import { RunSnapshot } from '../../domain/simulation/RunSnapshot';
import { RunErrors } from '../../domain/shared/errors';
import { ContainerHandle, ContainerManagerPort } from '../../ports/ContainerManagerPort';
import { Logger } from '../../ports/Logger';
import { RunStore } from '../../ports/RunStore';
import Run from '../../domain/simulation/Run';
import SimulationLifecycleManager from './SimulationLifecycleManager';

export const STOP_TIMEOUT_SECONDS = 10;

export default class StopSimulation{
    constructor(
        private readonly runStore: RunStore,
        private readonly containerManager: ContainerManagerPort,
        private readonly lifecycleManager: SimulationLifecycleManager,
        private readonly logger: Logger
    ){}

    async stop(runId: string): Promise<RunSnapshot>{
        const [run, container] = await this.stopping(runId);

        this.logger.info(`Stopping run ${run.id}: SIGTERM, then a kill after ${STOP_TIMEOUT_SECONDS} s`);
        await this.containerManager.stop(container, STOP_TIMEOUT_SECONDS);

        return run.snapshot();
    }

    async kill(runId: string): Promise<RunSnapshot>{
        const [run, container] = await this.stopping(runId);

        this.logger.warn(`Killing run ${run.id} and removing its container`);
        await this.containerManager.remove(container);

        return run.snapshot();
    }

    private async stopping(runId: string): Promise<[Run, ContainerHandle]>{
        const run = await this.runStore.get(runId);
        if(!run){
            throw RunErrors.NotFound(runId);
        }

        if(!run.containerId){
            throw RunErrors.NoContainer(runId);
        }

        await this.lifecycleManager.requestStop(run);
        return [run, { id: run.containerId }];
    }
}
