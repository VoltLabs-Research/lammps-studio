import { RuntimeEventMap } from '../../domain/observability/EventMap';
import Run from '../../domain/simulation/Run';
import { ScalarValue } from '../../domain/shared/types';
import { EventBusPort } from '../../ports/EventBusPort';

export default class SimulationEventPublisher{
    constructor(private readonly eventBus: EventBusPort<RuntimeEventMap>){}

    created(run: Run){
        this.eventBus.emit('simulation:created', {
            runId: run.id,
            imageTag: run.imageTag,
            outputDir: run.outputDir,
            snapshot: run.snapshot()
        });
    }

    started(run: Run, containerId: string){
        this.eventBus.emit('simulation:start', {
            runId: run.id,
            imageTag: run.imageTag,
            containerId,
            outputDir: run.outputDir,
            snapshot: run.snapshot()
        });
    }

    state(run: Run){
        this.eventBus.emit('simulation:state', { runId: run.id, state: run.state, snapshot: run.snapshot() });
    }

    stdout(run: Run, line: string){
        this.eventBus.emit('simulation:stdout', { runId: run.id, line, snapshot: run.snapshot() });
    }

    stderr(run: Run, line: string){
        this.eventBus.emit('simulation:stderr', { runId: run.id, line, snapshot: run.snapshot() });
    }

    error(run: Run, error: string){
        this.eventBus.emit('simulation:error', { runId: run.id, error, snapshot: run.snapshot() });
    }

    end(run: Run, exitCode: number | null){
        this.eventBus.emit('simulation:end', { runId: run.id, exitCode, snapshot: run.snapshot() });
    }

    thermo(run: Run, step: number | null, values: Record<string, ScalarValue>, raw: string){
        this.eventBus.emit('thermo', { runId: run.id, step, values, raw, snapshot: run.snapshot() });
    }

    timestep(run: Run, step: number, source: 'thermo' | 'dump'){
        this.eventBus.emit('timestep', { runId: run.id, step, source, snapshot: run.snapshot() });
    }

    dumpDetected(run: Run, path: string){
        this.eventBus.emit('dump:detected', { runId: run.id, path, snapshot: run.snapshot() });
    }

    dumpFrame(run: Run, path: string, step: number){
        this.eventBus.emit('dump:frame', { runId: run.id, path, step, snapshot: run.snapshot() });
    }
}
