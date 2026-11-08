import Docker from 'dockerode';
import type { Logger as PinoBaseLogger } from 'pino';
import Build from '../domain/build/Build';
import { BuildIdentity, BuildResult, BuildSpec } from '../domain/build/BuildSpec';
import { RuntimeEvent, RuntimeEventMap } from '../domain/observability/EventMap';
import Run from '../domain/simulation/Run';
import RunHandle from '../domain/simulation/RunHandle';
import { RunSnapshot } from '../domain/simulation/RunSnapshot';
import { PreparedRun, RunSpec } from '../domain/simulation/RunSpec';
import EnsureImage from '../application/images/EnsureImage';
import AttachSimulation from '../application/simulations/AttachSimulation';
import LammpsCommandBuilder from '../application/simulations/LammpsCommandBuilder';
import RunMonitor from '../application/simulations/RunMonitor';
import SimulationEventPublisher from '../application/simulations/SimulationEventPublisher';
import SimulationLifecycleManager from '../application/simulations/SimulationLifecycleManager';
import StartSimulation from '../application/simulations/StartSimulation';
import StopSimulation from '../application/simulations/StopSimulation';
import { EventBusPort, EventHandler } from '../ports/EventBusPort';
import { Logger } from '../ports/Logger';
import { RunDirectoryPort } from '../ports/RunDirectoryPort';
import { RunContainer } from '../ports/ContainerManagerPort';
import InMemoryRunStore from '../infrastructure/fs/InMemoryRunStore';
import NodeRunDirectoryPreparer from '../infrastructure/fs/NodeRunDirectoryPreparer';
import PinoLogger from '../infrastructure/logging/PinoLogger';
import EventEmitterBus from '../infrastructure/events/EventEmitterBus';
import DockerImageBuilder from '../infrastructure/docker/DockerImageBuilder';
import DockerContainerManager from '../infrastructure/docker/DockerContainerManager';
import DockerContainerResolver from '../infrastructure/docker/DockerContainerResolver';
import DockerLogStreamer from '../infrastructure/docker/DockerLogStreamer';

export interface LammpsRuntimeOptions{
    docker?: Docker;
    logger?: PinoBaseLogger;
}

const ROOT_UID = 0;

const hostUser = (): string | null => {
    const uid = process.getuid?.();
    const gid = process.getgid?.();
    if(uid === undefined || gid === undefined || uid === ROOT_UID){
        return null;
    }

    return `${uid}:${gid}`;
};

export default class LammpsRuntime{
    private readonly eventBus: EventBusPort<RuntimeEventMap>;
    private readonly logger: Logger;
    private readonly runStore = new InMemoryRunStore();
    private readonly runDirectories: RunDirectoryPort;
    private readonly ensureImage: EnsureImage;
    private readonly startSimulation: StartSimulation;
    private readonly stopSimulation: StopSimulation;
    private readonly attachSimulation: AttachSimulation;

    constructor(options: LammpsRuntimeOptions = {}){
        const docker = options.docker ?? new Docker();

        this.logger = new PinoLogger(options.logger);
        this.eventBus = new EventEmitterBus<RuntimeEventMap>();

        const scoped = (scope: string) => this.logger.child({ scope });
        const containerResolver = new DockerContainerResolver(docker);
        const containerManager = new DockerContainerManager(docker, containerResolver, scoped('container-manager'));
        const logStreamer = new DockerLogStreamer(docker, containerResolver, scoped('log-streamer'));
        const eventPublisher = new SimulationEventPublisher(this.eventBus);
        const lifecycleManager = new SimulationLifecycleManager(this.runStore, eventPublisher);
        const monitor = new RunMonitor(containerManager, logStreamer, eventPublisher, lifecycleManager, scoped('run-monitor'));

        this.runDirectories = new NodeRunDirectoryPreparer(scoped('run-directories'));
        this.ensureImage = new EnsureImage(new DockerImageBuilder(docker, scoped('image-builder')), this.eventBus, scoped('ensure-image'));
        this.stopSimulation = new StopSimulation(this.runStore, containerManager, lifecycleManager, scoped('stop-simulation'));
        this.startSimulation = new StartSimulation(
            new LammpsCommandBuilder(),
            containerManager,
            lifecycleManager,
            monitor,
            (run) => this.handleFor(run),
            hostUser()
        );
        this.attachSimulation = new AttachSimulation(
            containerManager,
            this.runStore,
            lifecycleManager,
            monitor,
            (run) => this.handleFor(run),
            scoped('attach-simulation')
        );
    }

    describeBuild(spec: BuildSpec): BuildIdentity{
        return new Build(spec).identity();
    }

    async build(spec: BuildSpec, signal?: AbortSignal): Promise<BuildResult>{
        return await this.ensureImage.execute(spec, signal);
    }

    async prepareRun(simulationDir: string, entry: string): Promise<PreparedRun>{
        return await this.runDirectories.prepare(simulationDir, entry);
    }

    async run(spec: RunSpec): Promise<RunHandle>{
        return await this.startSimulation.execute(spec);
    }

    async listRunning(): Promise<RunContainer[]>{
        return await this.attachSimulation.listRunning();
    }

    async attach(containerId: string): Promise<RunHandle>{
        return await this.attachSimulation.execute(containerId);
    }

    async stop(runId: string): Promise<RunSnapshot>{
        return await this.stopSimulation.stop(runId);
    }

    async kill(runId: string): Promise<RunSnapshot>{
        return await this.stopSimulation.kill(runId);
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

    private handleFor(run: Run): RunHandle{
        return new RunHandle(
            run.id,
            this.eventBus,
            async () => await this.getRun(run.id),
            async () => await this.stop(run.id),
            async () => await this.kill(run.id)
        );
    }
}
