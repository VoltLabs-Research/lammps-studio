import type { ImageTag, ISODateString, RunID, RunState } from '../shared/types';

export interface RunSnapshot{
    id: RunID;
    simulationId: string;
    runNumber: number;
    imageTag: ImageTag;
    state: RunState;
    runDir: string;
    createdAt: ISODateString;
    startedAt: ISODateString | null;
    endedAt: ISODateString | null;
    containerId: string | null;
    exitCode: number | null;
    errorMessage: string | null;
}
