import { BuildIdentity, BuildResult, BuildSpec } from '../build/BuildSpec';
import { BuildProgress } from '../build/BuildStage';
import { DumpFrame } from '../dump/DumpFrame';
import { RunSnapshot } from '../simulation/RunSnapshot';

export interface BuildStartEvent extends BuildIdentity{
    spec: BuildSpec;
}

export interface BuildLogEvent{
    tag: string;
    hash: string;
    line: string;
}

export interface BuildProgressEvent extends BuildProgress{
    hash: string;
}

export interface BuildEndEvent{
    result: BuildResult;
}

export interface BuildErrorEvent{
    tag: string;
    hash: string;
    error: string;
}

export interface SimulationCreatedEvent{
    runId: string;
    imageTag: string;
    runDir: string;
    snapshot: RunSnapshot;
}

export interface SimulationStartEvent{
    runId: string;
    imageTag: string;
    containerId: string;
    runDir: string;
    snapshot: RunSnapshot;
}

export interface SimulationOutputEvent{
    runId: string;
    line: string;
}

export interface SimulationStateEvent{
    runId: string;
    state: RunSnapshot['state'];
    snapshot: RunSnapshot;
}

export interface SimulationEndEvent{
    runId: string;
    exitCode: number | null;
    snapshot: RunSnapshot;
}

export interface SimulationErrorEvent{
    runId: string;
    error: string;
    snapshot: RunSnapshot;
}

export interface DumpFrameEvent extends DumpFrame{
    runId: string;
}

export interface RuntimeEventMap{
    'build:start': BuildStartEvent;
    'build:log': BuildLogEvent;
    'build:progress': BuildProgressEvent;
    'build:end': BuildEndEvent;
    'build:error': BuildErrorEvent;
    'simulation:created': SimulationCreatedEvent;
    'simulation:start': SimulationStartEvent;
    'simulation:stdout': SimulationOutputEvent;
    'simulation:stderr': SimulationOutputEvent;
    'simulation:state': SimulationStateEvent;
    'simulation:end': SimulationEndEvent;
    'simulation:error': SimulationErrorEvent;
    'dump:frame': DumpFrameEvent;
}

export type RuntimeEvent = keyof RuntimeEventMap & string;
