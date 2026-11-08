import { machineRoutes } from '@lammps-studio/contracts/machine/routes';
import { call } from '@/shared/api/call';
import { createListStore } from '@/shared/store/list-store';

export const useMachinesStore = createListStore(() => call(machineRoutes.list), (machine) => machine.id);
