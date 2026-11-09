import { useEffect } from 'react';
import { countRunFiles, useRunFilesStore } from '@/modules/run-control/store/run-files';
import { latestRun, useRunSessionStore } from '@/shared/store/run-session';

export const useRunFileCount = (): number => {
    const simulationId = useRunSessionStore((state) => latestRun(state)?.simulationId ?? null);
    const number = useRunSessionStore((state) => latestRun(state)?.number ?? null);
    const outputDir = useRunSessionStore((state) => latestRun(state)?.outputDir ?? null);
    const runState = useRunSessionStore((state) => latestRun(state)?.state ?? null);
    const frames = useRunSessionStore((state) => latestRun(state)?.frames ?? 0);
    const count = useRunFilesStore((state) => (state.key === `${simulationId}/${number}` ? state.count : 0));

    useEffect(() => {
        if(simulationId === null || number === null || outputDir === null) return;

        void countRunFiles({ simulationId, number, outputDir });
    }, [simulationId, number, outputDir, runState, frames]);

    return count;
};
