import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Run, RunConfig } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { RunPhase } from '@/modules/run-control/domain/run-control';
import { runPhaseOf } from '@/modules/run-control/utils/run-phase';
import { useMachines } from '@/shared/hooks/use-machines';
import { useBuildsStore } from '@/shared/store/builds';
import { useNavigationStore } from '@/shared/store/navigation';
import { useRunDraftStore } from '@/shared/store/run-draft';
import { latestRun, useRunSessionStore, viewedRun } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';

export const useOpenSimulation = (): Simulation | null => {
    const simulationId = useNavigationStore((state) => state.simulationId);

    return useSimulationsStore((state) => state.items.find((item) => item.id === simulationId)) ?? null;
};

export const useLatestRun = (): Run | null => useRunSessionStore(latestRun);

export const useViewedRun = (): Run | null => useRunSessionStore(viewedRun);

export const useRunPhase = (): RunPhase => runPhaseOf(useOpenSimulation(), useLatestRun());

export const useDraftConfig = (): RunConfig | null => {
    const simulationId = useNavigationStore((state) => state.simulationId);

    return useRunDraftStore((state) => (state.simulationId === simulationId ? state.config : null));
};

export const useMachine = (machineId: string | null): Machine | null => {
    const machines = useMachines();

    return machines.find((machine) => machine.id === machineId) ?? null;
};

export const useDraftMachine = (): Machine | null => {
    const simulation = useOpenSimulation();
    const config = useDraftConfig();

    return useMachine(config?.machineId ?? simulation?.machineId ?? null);
};

export const useRunBuild = (run: Run | null): Build | null => {
    const hash = run?.buildHash ?? null;

    return useBuildsStore((state) => state.items.find((build) => build.hash === hash)) ?? null;
};
