import { Machine } from '@lammps-studio/contracts/machine/domain';
import { useConnectionStore } from '@/shared/store/connection';
import { useMachinesStore } from '@/shared/store/machines';

const OFFLINE_LOCAL: Machine = {
    id: 'local',
    name: 'This computer',
    kind: 'local',
    status: 'offline',
    host: '',
    os: '',
    cpu: '',
    cores: 0,
    memory: '',
    gpus: 0,
    runtime: '',
    scheduler: null,
    agentVersion: '',
    root: '',
    diskFree: '',
    offlineSince: null
};

export const useMachines = (): Machine[] => {
    const machines = useMachinesStore((state) => state.items);
    const offline = useConnectionStore((state) => state.status === 'offline');

    if(!offline) return machines;
    if(machines.length === 0) return [OFFLINE_LOCAL];

    return machines.map((machine) => (machine.kind === 'local' ? { ...machine, status: 'offline' } : machine));
};
