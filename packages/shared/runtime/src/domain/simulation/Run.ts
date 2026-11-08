import type { ImageTag, ISODateString, RunID, RunState } from '../shared/types';
import type { RunSnapshot } from './RunSnapshot';
import { runIdOf } from './RunSpec';

const now = (): ISODateString => new Date().toISOString();

export interface RunIdentity{
    simulationId: string;
    runNumber: number;
    imageTag: ImageTag;
    runDir: string;
}

export default class Run{
    readonly id: RunID;
    readonly simulationId: string;
    readonly runNumber: number;
    readonly imageTag: ImageTag;
    readonly runDir: string;
    readonly createdAt: ISODateString = now();
    state: RunState = 'created';
    startedAt: ISODateString | null = null;
    endedAt: ISODateString | null = null;
    containerId: string | null = null;
    exitCode: number | null = null;
    errorMessage: string | null = null;

    constructor(identity: RunIdentity){
        this.id = runIdOf(identity.simulationId, identity.runNumber);
        this.simulationId = identity.simulationId;
        this.runNumber = identity.runNumber;
        this.imageTag = identity.imageTag;
        this.runDir = identity.runDir;
    }

    markPreparing(){
        this.state = 'preparing';
    }

    attachContainer(containerId: string){
        this.containerId = containerId;
    }

    markStarting(){
        this.state = 'starting';
    }

    markRunning(startedAt: ISODateString | null){
        this.state = 'running';
        this.startedAt = startedAt ?? this.startedAt ?? now();
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

    markCancelled(exitCode: number | null){
        this.state = 'cancelled';
        this.exitCode = exitCode;
        this.endedAt = now();
    }

    isStopping(): boolean{
        return this.state === 'stopping';
    }

    snapshot(): RunSnapshot{
        return {
            id: this.id,
            simulationId: this.simulationId,
            runNumber: this.runNumber,
            imageTag: this.imageTag,
            state: this.state,
            runDir: this.runDir,
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            containerId: this.containerId,
            exitCode: this.exitCode,
            errorMessage: this.errorMessage
        };
    }
}
