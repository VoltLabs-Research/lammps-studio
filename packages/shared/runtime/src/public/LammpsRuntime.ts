import Docker from 'dockerode';
import type { Logger as PinoBaseLogger } from 'pino';
import Build from '../domain/build/Build';
import { BuildIdentity, BuildResult, BuildSpec } from '../domain/build/BuildSpec';
import { RuntimeEvent, RuntimeEventMap } from '../domain/observability/EventMap';
import RunHandle from '../domain/simulation/RunHandle';
import { RunSnapshot } from '../domain/simulation/RunSnapshot';
import { SimulationSpec } from '../domain/simulation/SimulationSpec';
import EnsureImage from '../application/images/EnsureImage';
import LammpsCommandBuilder from '../application/simulations/LammpsCommandBuilder';
import SimulationEventPublisher from '../application/simulations/SimulationEventPublisher';
import SimulationLifecycleManager from '../application/simulations/SimulationLifecycleManager';
import StartSimulation from '../application/simulations/StartSimulation';
import StopSimulation from '../application/simulations/StopSimulation';
import { EventBusPort, EventHandler } from '../ports/EventBusPort';
import { Logger } from '../ports/Logger';
import InMemoryRunStore from '../infrastructure/fs/InMemoryRunStore';
import PinoLogger from '../infrastructure/logging/PinoLogger';
import EventEmitterBus from '../infrastructure/events/EventEmitterBus';
import DockerImageBuilder from '../infrastructure/docker/DockerImageBuilder';
import DockerContainerManager from '../infrastructure/docker/DockerContainerManager';
import DockerContainerResolver from '../infrastructure/docker/DockerContainerResolver';
import DockerLogStreamer from '../infrastructure/docker/DockerLogStreamer';
import ChokidarFileWatcher from '../infrastructure/fs/ChokidarFileWatcher';
import NodeWorkspacePreparer from '../infrastructure/fs/NodeWorkspacePreparer';

export interface LammpsRuntimeOptions{
    docker?: Docker;
    logger?: PinoBaseLogger;
}

export default class LammpsRuntime{
    private readonly eventBus: EventBusPort<RuntimeEventMap>;
    private readonly logger: Logger;
    private readonly runStore = new InMemoryRunStore();

    private readonly ensureImage: EnsureImage;
    private readonly startSimulation: StartSimulation;
    private readonly stopSimulation: StopSimulation;

    constructor(options: LammpsRuntimeOptions = {}){
        const docker = options.docker ?? new Docker();

        this.logger = new PinoLogger(options.logger);
        this.eventBus = new EventEmitterBus<RuntimeEventMap>();

        const containerResolver = new DockerContainerResolver(docker);
        const imageBuilder = new DockerImageBuilder(docker, this.logger.child({ scope: 'image-builder' }));
        const containerManager = new DockerContainerManager(docker, containerResolver, this.logger.child({ scope: 'container-manager' }));
        const logStreamer = new DockerLogStreamer(docker, containerResolver, this.logger.child({ scope: 'log-streamer' }));
        const fileWatcher = new ChokidarFileWatcher(this.logger.child({ scope: 'file-watcher' }));
        const workspacePreparer = new NodeWorkspacePreparer(this.logger.child({ scope: 'workspace-preparer' }));
        const eventPublisher = new SimulationEventPublisher(this.eventBus);
        const lifecycleManager = new SimulationLifecycleManager(this.runStore, eventPublisher);

        this.ensureImage = new EnsureImage(imageBuilder, this.eventBus, this.logger.child({ scope: 'ensure-image' }));
        this.stopSimulation = new StopSimulation(this.runStore, containerManager, lifecycleManager, this.logger.child({ scope: 'stop-simulation' }));
        this.startSimulation = new StartSimulation(
            this.ensureImage,
            workspacePreparer,
            new LammpsCommandBuilder(),
            containerManager,
            logStreamer,
            fileWatcher,
            this.runStore,
            this.eventBus,
            eventPublisher,
            lifecycleManager,
            this.stopSimulation,
            this.logger.child({ scope: 'start-simulation' })
        );
    }

    describeBuild(spec: BuildSpec): BuildIdentity{
        return new Build(spec).identity();
    }

    async build(spec: BuildSpec, signal?: AbortSignal): Promise<BuildResult>{
        return await this.ensureImage.execute(spec, signal);
    }

    async run(spec: SimulationSpec): Promise<RunHandle>{
        return await this.startSimulation.execute(spec);
    }

    async stop(runId: string): Promise<RunSnapshot>{
        return await this.stopSimulation.execute(runId, false);
    }

    async kill(runId: string): Promise<RunSnapshot>{
        return await this.stopSimulation.execute(runId, true);
    }

    async getRun(runId: string): Promise<RunSnapshot | null>{
        const run = await this.runStore.get(runId);
        return run?.snapshot() ?? null;
    }

    async listRuns(): Promise<RunSnapshot[]>{
        const runs = await this.runStore.list();
        return runs.map((run) => run.snapshot());
    }

    on<K extends RuntimeEvent>(event: K, handler: EventHandler<RuntimeEventMap[K]>): () => void{
        return this.eventBus.on(event, handler);
    }

    off<K extends RuntimeEvent>(event: K, handler: EventHandler<RuntimeEventMap[K]>){
        this.eventBus.off(event, handler);
    }

    once<K extends RuntimeEvent>(event: K, handler: EventHandler<RuntimeEventMap[K]>): () => void{
        return this.eventBus.once(event, handler);
    }
}
