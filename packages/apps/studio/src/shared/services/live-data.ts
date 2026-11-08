import { onConnect, subscribe } from '@/shared/api/events';
import { useBuildsStore } from '@/shared/store/builds';
import { useMachinesStore } from '@/shared/store/machines';
import { applyRun, useSimulationsStore } from '@/shared/store/simulations';

const STORES = [useSimulationsStore, useMachinesStore, useBuildsStore];

const loadAll = () => STORES.forEach((store) => void store.getState().load());

const anyFailed = (): boolean => STORES.some((store) => store.getState().status === 'failed');

export const startLiveData = () => {
    let connections = 0;

    subscribe('simulation:updated', ({ simulation }) => useSimulationsStore.getState().upsert(simulation));
    subscribe('simulation:removed', ({ simulationId }) => useSimulationsStore.getState().remove(simulationId));
    subscribe('run:updated', ({ run }) => applyRun(run));
    subscribe('machine:updated', ({ machine }) => useMachinesStore.getState().upsert(machine));
    subscribe('build:updated', ({ build }) => useBuildsStore.getState().upsert(build));
    onConnect(() => {
        connections += 1;
        if(connections > 1 || anyFailed()) loadAll();
    });
    loadAll();
};
