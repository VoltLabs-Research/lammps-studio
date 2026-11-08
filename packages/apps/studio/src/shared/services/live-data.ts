import { onReconnect, subscribe } from '@/shared/api/events';
import { useBuildsStore } from '@/shared/store/builds';
import { useMachinesStore } from '@/shared/store/machines';
import { applyRun, useSimulationsStore } from '@/shared/store/simulations';

const loadAll = () => {
    void useSimulationsStore.getState().load();
    void useMachinesStore.getState().load();
    void useBuildsStore.getState().load();
};

export const startLiveData = () => {
    subscribe('simulation:updated', ({ simulation }) => useSimulationsStore.getState().upsert(simulation));
    subscribe('simulation:removed', ({ simulationId }) => useSimulationsStore.getState().remove(simulationId));
    subscribe('run:updated', ({ run }) => applyRun(run));
    subscribe('machine:updated', ({ machine }) => useMachinesStore.getState().upsert(machine));
    subscribe('build:updated', ({ build }) => useBuildsStore.getState().upsert(build));
    onReconnect(loadAll);
    loadAll();
};
