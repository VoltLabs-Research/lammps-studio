import { CreateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { call } from '@/shared/api/call';

export const simulationApi = {
    create: (body: CreateSimulationInput) => call(simulationRoutes.create, { body }),

    duplicate: (simulationId: string) => call(simulationRoutes.duplicate, { path: { simulationId } }),

    remove: (simulationId: string) => call(simulationRoutes.remove, { path: { simulationId } })
};
