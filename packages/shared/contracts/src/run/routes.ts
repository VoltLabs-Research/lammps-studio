import { get, post } from '../shared/routing';
import { FrameInfo, LogLine, Run, ThermoSection } from './domain';
import { StartRunInput, StopRunInput } from './http';

export const runRoutes = {
    list: get<Run[]>('/runs/:simulationId'),
    start: post<StartRunInput, Run>('/runs/:simulationId'),
    get: get<Run>('/runs/:simulationId/:runNumber'),
    stop: post<StopRunInput, Run>('/runs/:simulationId/:runNumber/stop'),
    log: get<LogLine[]>('/runs/:simulationId/:runNumber/log'),
    thermo: get<ThermoSection[]>('/runs/:simulationId/:runNumber/thermo'),
    frames: get<FrameInfo[]>('/runs/:simulationId/:runNumber/frames'),
    frame: get<ArrayBuffer>('/runs/:simulationId/:runNumber/frames/:frameIndex')
};
