import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { useFiltersStore } from '@/modules/simulations/store/filters';
import { phaseOf } from '@/modules/simulations/utils/simulation-phase';
import { matchesStatus, STATUS_FILTERS, StatusFilter } from '@/modules/simulations/utils/status-filters';
import { SegOption } from '@/shared/contracts/ui';
import { useMachines } from '@/shared/hooks/use-machines';
import { useSimulationsStore } from '@/shared/store/simulations';

export interface VisibleSimulations{
    machine: Machine | null;
    machines: Machine[];
    filters: SegOption<StatusFilter>[];
    simulations: Simulation[];
    onMachine: number;
}

export const useVisibleSimulations = (): VisibleSimulations => {
    const all = useSimulationsStore((state) => state.items);
    const loaded = useSimulationsStore((state) => state.status === 'ready');
    const machines = useMachines();
    const status = useFiltersStore((state) => state.status);
    const machineId = useFiltersStore((state) => state.machineId);

    const machine = machines.find((item) => item.id === machineId) ?? null;
    const base = machine ? all.filter((simulation) => simulation.machineId === machine.id) : all;
    const phased = base.map((simulation) => ({ simulation, phase: phaseOf(simulation) }));

    return {
        machine,
        machines,
        filters: STATUS_FILTERS.map(({ value, label, matches }) => ({
            value,
            label,
            count: loaded ? phased.filter(({ phase }) => matches(phase)).length : undefined
        })),
        simulations: phased.filter(({ phase }) => matchesStatus(status, phase)).map(({ simulation }) => simulation),
        onMachine: base.length
    };
};
