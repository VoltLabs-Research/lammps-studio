import crypto from 'node:crypto';
import { ResolvedSimulationSpec, SimulationSpec } from '../../domain/simulation/SimulationSpec';
import Run from '../../domain/simulation/Run';
import RunHandle from '../../domain/simulation/RunHandle';
import { RuntimeEventMap } from '../../domain/observability/EventMap';
import { toError } from '../../domain/shared/toError';
import { RunStore } from '../../ports/RunStore';
import { PreparedWorkspace, WorkspacePreparerPort } from '../../ports/WorkspacePreparerPort';
import { ContainerHandle, ContainerManagerPort } from '../../ports/ContainerManagerPort';
import { LogStreamerPort, LogStreamHandle } from '../../ports/LogStreamerPort';
import { FileWatcher, FileWatchHandle } from '../../ports/FileWatcher';
import { EventBusPort } from '../../ports/EventBusPort';
import { Logger } from '../../ports/Logger';
import EnsureImage from '../images/EnsureImage';
import LammpsOutputInterpreter from './LammpsOutputInterpreter';
import DumpFrameTracker from './DumpFrameTracker';
import LammpsCommandBuilder from './LammpsCommandBuilder';
import SimulationEventPublisher from './SimulationEventPublisher';
import SimulationLifecycleManager from './SimulationLifecycleManager';
import StopSimulation from './StopSimulation';

const DEFAULT_DUMP_PATTERNS = ['*.dump', '*.lammpstrj', '*.traj', 'dump*'];
const CONTAINER_INPUT_DIR = '/workspace/input';
const CONTAINER_OUTPUT_DIR = '/workspace/output';

interface RunResources{
    workspace: PreparedWorkspace | null;
    container: ContainerHandle | null;
    logStream: LogStreamHandle | null;
    watchHandle: FileWatchHandle | null;
}

const resolveSpec = (spec: SimulationSpec): ResolvedSimulationSpec => {
    return {
        image: spec.image,
        inputFile: spec.inputFile,
        inputFiles: spec.inputFiles ?? [],
        variables: spec.variables ?? {},
        env: spec.env ?? {},
        labels: spec.labels ?? {},
        resources: spec.resources ?? {},
        execution: {
            binary: spec.execution?.binary ?? 'lmp',
            mpiRanks: spec.execution?.mpiRanks ?? 1,
            extraArgs: [...(spec.execution?.extraArgs ?? [])],
            workingDir: spec.execution?.workingDir ?? CONTAINER_OUTPUT_DIR,
            shell: spec.execution?.shell ?? '/bin/bash',
            ...(spec.execution?.containerName ? { containerName: spec.execution.containerName } : {})
        },
        dumpWatch: {
            enabled: spec.dumpWatch?.enabled ?? true,
            patterns: spec.dumpWatch?.patterns ?? DEFAULT_DUMP_PATTERNS,
            parseTimesteps: spec.dumpWatch?.parseTimesteps ?? true
        },
        cleanup: {
            removeContainer: spec.cleanup?.removeContainer ?? true,
            removeWorkspace: spec.cleanup?.removeWorkspace ?? false
        },
        outputDir: spec.outputDir
    };
};

export default class StartSimulation{
    constructor(
        private readonly ensureImage: EnsureImage,
        private readonly workspacePreparer: WorkspacePreparerPort,
        private readonly commandBuilder: LammpsCommandBuilder,
        private readonly containerManager: ContainerManagerPort,
        private readonly logStreamer: LogStreamerPort,
        private readonly fileWatcher: FileWatcher,
        private readonly runStore: RunStore,
        private readonly eventBus: EventBusPort<RuntimeEventMap>,
        private readonly eventPublisher: SimulationEventPublisher,
        private readonly lifecycleManager: SimulationLifecycleManager,
        private readonly stopSimulation: StopSimulation,
        private readonly logger: Logger
    ){}

    async execute(input: SimulationSpec): Promise<RunHandle>{
        const spec = resolveSpec(input);
        const imageTag = typeof spec.image === 'string' ? spec.image : (await this.ensureImage.execute(spec.image)).tag;
        const run = new Run(crypto.randomUUID(), imageTag, spec.outputDir);
        const resources: RunResources = { workspace: null, container: null, logStream: null, watchHandle: null };

        await this.lifecycleManager.prepare(run);

        try{
            await this.launch(run, spec, resources);
        }catch(error){
            await this.lifecycleManager.fail(run, toError(error).message, null);
            await this.cleanupResources(spec, resources);
            throw error;
        }

        void this.monitorCompletion(run, spec, resources);

        return this.createHandle(run);
    }

    private async launch(run: Run, spec: ResolvedSimulationSpec, resources: RunResources){
        const workspace = await this.workspacePreparer.prepare(run.id, spec);
        resources.workspace = workspace;

        const container = await this.containerManager.create({
            imageTag: run.imageTag,
            name: spec.execution.containerName ?? `lammps-${run.id}`,
            command: this.commandBuilder.build(spec, workspace.mainInputContainerPath),
            workingDir: spec.execution.workingDir,
            shell: spec.execution.shell,
            binds: [`${workspace.inputDir}:${CONTAINER_INPUT_DIR}:ro`, `${workspace.outputDir}:${CONTAINER_OUTPUT_DIR}`],
            env: spec.env,
            labels: spec.labels,
            cpus: spec.resources.cpus,
            memory: spec.resources.memory,
            gpus: spec.resources.gpus
        });
        resources.container = container;

        await this.lifecycleManager.markStarting(run, container.id);
        resources.logStream = await this.streamOutput(run, container);
        resources.watchHandle = await this.watchDumps(run, spec, workspace);

        await this.containerManager.start(container);
        await this.lifecycleManager.markRunning(run, container.id);
    }

    private async streamOutput(run: Run, container: ContainerHandle): Promise<LogStreamHandle>{
        const interpreter = new LammpsOutputInterpreter();

        return await this.logStreamer.stream(container, {
            onStdout: async (line) => await this.handleStdout(run, line, interpreter),
            onStderr: (line) => this.eventPublisher.stderr(run, line),
            onError: (error) => this.handleError(run, error)
        });
    }

    private async watchDumps(run: Run, spec: ResolvedSimulationSpec, workspace: PreparedWorkspace): Promise<FileWatchHandle | null>{
        if(!spec.dumpWatch.enabled){
            return null;
        }

        const tracker = new DumpFrameTracker();
        const onDump = async (filePath: string) => await this.handleDumpFile(run, filePath, tracker, spec.dumpWatch.parseTimesteps);

        return await this.fileWatcher.watch(workspace.outputDir, spec.dumpWatch.patterns, {
            onAdd: onDump,
            onChange: onDump,
            onError: (error) => this.handleError(run, error)
        });
    }

    private createHandle(run: Run): RunHandle{
        return new RunHandle(
            run.id,
            this.eventBus,
            async () => (await this.runStore.get(run.id))?.snapshot() ?? null,
            async () => await this.stopSimulation.execute(run.id, false),
            async () => await this.stopSimulation.execute(run.id, true)
        );
    }

    private async handleStdout(run: Run, line: string, interpreter: LammpsOutputInterpreter){
        this.eventPublisher.stdout(run, line);

        for(const event of interpreter.consume(line)){
            if(event.type === 'thermo'){
                if(event.step !== null){
                    await this.recordStep(run, event.step);
                }

                this.eventPublisher.thermo(run, event.step, event.values, event.raw);
                continue;
            }

            await this.recordStep(run, event.step);
            this.eventPublisher.timestep(run, event.step, event.source);
        }
    }

    private async handleDumpFile(run: Run, filePath: string, tracker: DumpFrameTracker, parseTimesteps: boolean){
        this.eventPublisher.dumpDetected(run, filePath);

        if(!parseTimesteps){
            return;
        }

        for(const step of await tracker.readNewSteps(filePath)){
            await this.recordStep(run, step);
            this.eventPublisher.dumpFrame(run, filePath, step);
            this.eventPublisher.timestep(run, step, 'dump');
        }
    }

    private handleError(run: Run, error: Error){
        this.logger.error(`Run ${run.id} error ${error.message}`);
        this.eventPublisher.error(run, error.message);
    }

    private async monitorCompletion(run: Run, spec: ResolvedSimulationSpec, resources: RunResources){
        try{
            if(resources.container){
                const result = await this.containerManager.wait(resources.container);
                await this.lifecycleManager.settle(run, result.exitCode);
            }
        }catch(error){
            await this.lifecycleManager.fail(run, toError(error).message, null);
        }finally{
            await this.cleanupResources(spec, resources);
        }
    }

    private async recordStep(run: Run, step: number){
        run.recordStep(step);
        await this.runStore.update(run);
    }

    private async cleanupResources(spec: ResolvedSimulationSpec, resources: RunResources){
        await resources.logStream?.close();
        await resources.watchHandle?.close();

        if(resources.container && spec.cleanup.removeContainer){
            await this.containerManager.remove(resources.container);
        }

        if(resources.workspace && spec.cleanup.removeWorkspace){
            await this.workspacePreparer.cleanup(resources.workspace);
        }
    }
}
