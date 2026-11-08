import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { isActive, phaseOf } from '@/modules/simulations/utils/simulation-phase';

const countOf = (count: number, label: string): string | null => (count === 0 ? null : `${count} ${label}`);

export const machineStatusOf = (machine: Machine, simulations: Simulation[]): string => {
    if(machine.status === 'offline') return 'Offline';

    const phases = simulations.filter((simulation) => simulation.machineId === machine.id).map(phaseOf);
    const running = countOf(phases.filter(isActive).length, 'running');
    const queued = countOf(phases.filter((phase) => phase === 'queued').length, 'queued');

    return [running, queued].filter((part) => part !== null).join(' · ');
};
