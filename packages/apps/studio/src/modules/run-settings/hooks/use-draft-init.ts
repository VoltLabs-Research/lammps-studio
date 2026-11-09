import { useEffect } from 'react';
import { initialDraft } from '@/modules/run-settings/utils/draft-defaults';
import { requireScriptPackages } from '@/modules/run-settings/utils/draft-edits';
import { useMachinesStore } from '@/shared/store/machines';
import { useRunDraftStore } from '@/shared/store/run-draft';
import { latestRun, useRunSessionStore } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';

const draftFrom = (simulationId: string) => {
    const session = useRunSessionStore.getState();
    const simulation = useSimulationsStore.getState().items.find((item) => item.id === simulationId);
    if(!simulation) return;

    const machine = useMachinesStore.getState().items.find((item) => item.id === simulation.machineId) ?? null;
    useRunDraftStore.getState().setDraft(simulationId, initialDraft({ simulation, machine, latestRun: latestRun(session), script: session.script }));
};

export const useDraftInit = (simulationId: string | null) => {
    const sessionReady = useRunSessionStore((state) => state.simulationId === simulationId
        && (state.runs.length > 0 || (state.status !== 'loading' && (state.script !== null || state.scriptError !== null))));
    const machinesReady = useMachinesStore((state) => state.status !== 'loading');
    const simulationKnown = useSimulationsStore((state) => state.items.some((item) => item.id === simulationId));
    const drafted = useRunDraftStore((state) => state.simulationId === simulationId);

    useEffect(() => {
        if(simulationId === null || drafted || !sessionReady || !machinesReady || !simulationKnown) return;

        draftFrom(simulationId);
    }, [simulationId, drafted, sessionReady, machinesReady, simulationKnown]);

    useEffect(() => useRunSessionStore.subscribe((state, previous) => {
        if(state.script !== previous.script && state.simulationId === simulationId) requireScriptPackages(state.script);
    }), [simulationId]);
};
