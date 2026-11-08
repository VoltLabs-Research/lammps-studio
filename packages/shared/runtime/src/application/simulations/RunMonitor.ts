import Run from '../../domain/simulation/Run';
import { toError } from '../../domain/shared/toError';
import { ContainerHandle, ContainerManagerPort } from '../../ports/ContainerManagerPort';
import { Logger } from '../../ports/Logger';
import { LogStreamerPort, LogStreamHandle } from '../../ports/LogStreamerPort';
import SimulationEventPublisher from './SimulationEventPublisher';
import SimulationLifecycleManager from './SimulationLifecycleManager';

export interface RunSession{
    logStream: LogStreamHandle;
}

export default class RunMonitor{
    constructor(
        private readonly containerManager: ContainerManagerPort,
        private readonly logStreamer: LogStreamerPort,
        private readonly eventPublisher: SimulationEventPublisher,
        private readonly lifecycleManager: SimulationLifecycleManager,
        private readonly logger: Logger
    ){}

    async observe(run: Run, container: ContainerHandle): Promise<RunSession>{
        const logStream = await this.logStreamer.stream(container, {
            onStdout: (line) => this.eventPublisher.stdout(run, line),
            onStderr: (line) => this.eventPublisher.stderr(run, line),
            onError: (error) => this.reportError(run, error)
        });

        return { logStream };
    }

    async complete(run: Run, container: ContainerHandle, session: RunSession){
        try{
            const { exitCode } = await this.containerManager.wait(container);
            await session.logStream.ended;
            await this.lifecycleManager.settle(run, exitCode);
        }catch(error){
            await this.lifecycleManager.fail(run, toError(error).message);
        }finally{
            await this.release(container, session);
        }
    }

    async release(container: ContainerHandle, session: RunSession | null){
        await session?.logStream.close();
        await this.containerManager.remove(container);
    }

    private reportError(run: Run, error: Error){
        this.logger.error(`Run ${run.id} stream error: ${error.message}`);
        this.eventPublisher.error(run, error.message);
    }
}
