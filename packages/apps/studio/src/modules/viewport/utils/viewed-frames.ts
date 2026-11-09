import type { FrameInfo } from '@lammps-studio/contracts/run/domain';
import type { FrameSpan } from '@/modules/viewport/domain/workspace';
import { useRunSessionStore, viewedRun } from '@/shared/store/run-session';

type RunSession = ReturnType<typeof useRunSessionStore.getState>;

export const runKeyOf = (session: RunSession): string | null => {
    if(session.simulationId === null || session.runNumber === null) return null;

    return `${session.simulationId}/${session.runNumber}`;
};

export const spanOf = (session: RunSession): FrameSpan => ({
    count: session.frames.length,
    running: viewedRun(session)?.state === 'running'
});

export const frameKeyOf = (runKey: string, frame: FrameInfo): string => `${runKey}/${frame.index}`;
