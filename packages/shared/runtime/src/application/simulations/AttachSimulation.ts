import Run from '../../domain/simulation/Run';
import RunHandle from '../../domain/simulation/RunHandle';
import { RunErrors } from '../../domain/shared/errors';
import { ContainerManagerPort, RunContainer } from '../../ports/ContainerManagerPort';
import { Logger } from '../../ports/Logger';
import { RunStore } from '../../ports/RunStore';
import { runIdOf } from '../../domain/simulation/RunSpec';
import RunMonitor from './RunMonitor';
import SimulationLifecycleManager from './SimulationLifecycleManager';

export default class AttachSimulation{
    constructor(
        private readonly containerManager: ContainerManagerPort,
        private readonly runStore: RunStore,
        private readonly lifecycleManager: SimulationLifecycleManager,
        private readonly monitor: RunMonitor,
        private readonly createHandle: (run: Run) => RunHandle,
        private readonly logger: Logger
    ){}

    async listRunning(): Promise<RunContainer[]>{
        const containers = await this.containerManager.list();
        return containers.filter((container) => container.state !== 'created');
    }

    async execute(containerId: string): Promise<RunHandle>{
        const info = await this.containerManager.inspect(containerId);
        const known = await this.runStore.get(runIdOf(info.simulationId, info.runNumber));
        if(known?.containerId === info.id){
            return this.createHandle(known);
        }

        if(info.state === 'created'){
            await this.containerManager.remove(info);
            throw RunErrors.NeverStarted(info.id);
        }

        const run = new Run({
            simulationId: info.simulationId,
            runNumber: info.runNumber,
            imageTag: info.image,
            runDir: info.runDir
        });

        await this.lifecycleManager.prepare(run);
        await this.lifecycleManager.markStarting(run, info.id);
        const session = await this.monitor.observe(run, info);

        if(info.state === 'running'){
            await this.lifecycleManager.markRunning(run, info.id, info.startedAt);
        }

        this.logger.info(`Reattached run ${run.id}`, { containerId: info.id, state: info.state });
        void this.monitor.complete(run, info, session);

        return this.createHandle(run);
    }
}
