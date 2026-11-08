import { Run, RunSummary } from '@lammps-studio/contracts/run/domain';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { call } from '@/shared/api/call';
import { createListStore } from '@/shared/store/list-store';

export const useSimulationsStore = createListStore(() => call(simulationRoutes.list), (simulation) => simulation.id);

const summaryOf = ({ number, state, startedAt, endedAt, progress, error }: Run): RunSummary => ({
    number,
    state,
    startedAt,
    endedAt,
    progress,
    error
});

export const applyRun = (run: Run) => useSimulationsStore.setState((state) => ({
    items: state.items.map((simulation) => {
        if(simulation.id !== run.simulationId) return simulation;
        if(simulation.lastRun && simulation.lastRun.number > run.number) return simulation;

        return { ...simulation, lastRun: summaryOf(run) };
    })
}));
