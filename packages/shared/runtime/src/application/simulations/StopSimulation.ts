import { RunSnapshot } from '../../domain/simulation/RunSnapshot';
import { RunErrors } from '../../domain/shared/errors';
import { ContainerManagerPort } from '../../ports/ContainerManagerPort';
import { Logger } from '../../ports/Logger';
import { RunStore } from '../../ports/RunStore';
import SimulationLifecycleManager from './SimulationLifecycleManager';

const STOP_TIMEOUT_SECONDS = 10;

export default class StopSimulation{
    constructor(
        private readonly runStore: RunStore,
        private readonly containerManager: ContainerManagerPort,
        private readonly lifecycleManager: SimulationLifecycleManager,
        private readonly logger: Logger
    ){}

    async execute(runId: string, force: boolean): Promise<RunSnapshot>{
        const run = await this.runStore.get(runId);
        if(!run){
            throw RunErrors.NotFound(runId);
        }

        if(!run.containerId){
            throw RunErrors.NoContainer(runId);
        }

        await this.lifecycleManager.requestStop(run);
        const container = this.containerManager.get(run.containerId);

        if(force){
            this.logger.warn(`Killing container for run ${run.id}`);
            await this.containerManager.kill(container);
        }else{
            this.logger.info(`Stopping container for run ${run.id}`);
            await this.containerManager.stop(container, STOP_TIMEOUT_SECONDS);
        }

        return run.snapshot();
    }
}
