import { useEffect } from 'react';
import { openFolder, refreshFolder, useFolderStore } from '@/modules/files/store/folder';
import { latestRun, useRunSessionStore, viewedRun } from '@/shared/store/run-session';

export const useFolderSync = (simulationId: string | null) => {
    const latest = useRunSessionStore(latestRun);
    const frames = useRunSessionStore((state) => state.frames.length);
    const runsKnown = useRunSessionStore((state) => state.runs.length > 0 || state.status !== 'loading');
    const changes = `${latest?.number}:${latest?.state}:${frames}`;

    useEffect(() => {
        if(simulationId === null || !runsKnown) return;
        if(useFolderStore.getState().simulationId === simulationId){
            void refreshFolder();
            return;
        }

        void openFolder(simulationId, viewedRun(useRunSessionStore.getState())?.outputDir ?? '');
    }, [simulationId, runsKnown, changes]);
};
