import Run from '../../domain/simulation/Run';
import { ISODateString } from '../../domain/shared/types';
import { RunStore } from '../../ports/RunStore';
import SimulationEventPublisher from './SimulationEventPublisher';

export default class SimulationLifecycleManager{
    constructor(
        private readonly runStore: RunStore,
        private readonly eventPublisher: SimulationEventPublisher
    ){}

    async prepare(run: Run){
        run.markPreparing();
        await this.runStore.save(run);

        this.eventPublisher.created(run);
        this.eventPublisher.state(run);
    }

    async markStarting(run: Run, containerId: string){
        run.attachContainer(containerId);
        run.markStarting();
        await this.runStore.update(run);

        this.eventPublisher.state(run);
    }

    async markRunning(run: Run, containerId: string, startedAt: ISODateString | null){
        run.markRunning(startedAt);
        await this.runStore.update(run);

        this.eventPublisher.started(run, containerId);
        this.eventPublisher.state(run);
    }

    async requestStop(run: Run){
        run.requestStop();
        await this.runStore.update(run);

        this.eventPublisher.state(run);
    }

    async fail(run: Run, message: string){
        run.markFailed(message, null);
        await this.runStore.update(run);

        this.eventPublisher.state(run);
        this.eventPublisher.error(run, message);
        this.eventPublisher.end(run);
    }

    async settle(run: Run, exitCode: number | null){
        if(run.isStopping()){
            run.markCancelled(exitCode);
        }else if(exitCode === 0){
            run.markCompleted(exitCode);
        }else{
            run.markFailed(`LAMMPS exited with code ${exitCode}`, exitCode);
        }

        await this.runStore.update(run);

        this.eventPublisher.state(run);
        this.eventPublisher.end(run);
    }
}
