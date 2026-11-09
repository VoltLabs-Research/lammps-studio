import { useEffect } from 'react';
import { useDraftInit } from '@/modules/run-settings/hooks/use-draft-init';
import { closeSession, openSession } from '@/shared/store/run-session';

export const useWorkspaceSession = (simulationId: string | null) => {
    useEffect(() => {
        if(simulationId === null) return;

        void openSession(simulationId);

        return closeSession;
    }, [simulationId]);

    useDraftInit(simulationId);
};
