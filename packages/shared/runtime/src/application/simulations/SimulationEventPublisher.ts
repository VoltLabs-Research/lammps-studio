import { RuntimeEventMap } from '../../domain/observability/EventMap';
import Run from '../../domain/simulation/Run';
import { EventBusPort } from '../../ports/EventBusPort';

export default class SimulationEventPublisher{
    constructor(private readonly eventBus: EventBusPort<RuntimeEventMap>){}

    created(run: Run){
        this.eventBus.emit('simulation:created', {
            runId: run.id,
            imageTag: run.imageTag,
            runDir: run.runDir,
            snapshot: run.snapshot()
        });
    }

    started(run: Run, containerId: string){
        this.eventBus.emit('simulation:start', {
            runId: run.id,
            imageTag: run.imageTag,
            containerId,
            runDir: run.runDir,
            snapshot: run.snapshot()
        });
    }

    state(run: Run){
        this.eventBus.emit('simulation:state', { runId: run.id, state: run.state, snapshot: run.snapshot() });
    }

    stdout(run: Run, line: string){
        this.eventBus.emit('simulation:stdout', { runId: run.id, line });
    }

    stderr(run: Run, line: string){
        this.eventBus.emit('simulation:stderr', { runId: run.id, line });
    }

    error(run: Run, error: string){
        this.eventBus.emit('simulation:error', { runId: run.id, error, snapshot: run.snapshot() });
    }

    end(run: Run){
        this.eventBus.emit('simulation:end', { runId: run.id, exitCode: run.exitCode, snapshot: run.snapshot() });
    }
}
