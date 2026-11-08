import type { ImageTag, ISODateString, RunID, RunState } from '../shared/types';
import type { RunSnapshot } from './RunSnapshot';

const now = (): ISODateString => new Date().toISOString();

export default class Run{
    state: RunState = 'created';
    startedAt?: ISODateString;
    endedAt?: ISODateString;
    containerId?: string;
    exitCode?: number | null;
    errorMessage?: string;
    lastStep?: number;

    readonly createdAt: ISODateString = now();

    constructor(
        public readonly id: RunID,
        public readonly imageTag: ImageTag,
        public readonly outputDir: string
    ){}

    markPreparing(){
        this.state = 'preparing';
    }

    attachContainer(containerId: string){
        this.containerId = containerId;
    }

    markStarting(){
        this.state = 'starting';
    }

    markRunning(){
        this.state = 'running';
        this.startedAt ??= now();
    }

    requestStop(){
        this.state = 'stopping';
    }

    markCompleted(exitCode: number | null){
        this.state = 'completed';
        this.exitCode = exitCode;
        this.endedAt = now();
    }

    markFailed(message: string, exitCode: number | null){
        this.state = 'failed';
        this.errorMessage = message;
        this.exitCode = exitCode;
        this.endedAt = now();
    }

    markCancelled(){
        this.state = 'cancelled';
        this.endedAt = now();
    }

    recordStep(step: number){
        if(this.lastStep === undefined || step > this.lastStep){
            this.lastStep = step;
        }
    }

    isStopping(): boolean{
        return this.state === 'stopping';
    }

    snapshot(): RunSnapshot{
        return {
            id: this.id,
            imageTag: this.imageTag,
            state: this.state,
            outputDir: this.outputDir,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            containerId: this.containerId,
            exitCode: this.exitCode,
            errorMessage: this.errorMessage,
            lastStep: this.lastStep
        };
    }
}
