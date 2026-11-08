import { CreateBuildInput } from '@lammps-studio/contracts/build/http';
import { buildRoutes } from '@lammps-studio/contracts/build/routes';
import { call } from '@/shared/api/call';

export const buildApi = {
    create: (body: CreateBuildInput) => call(buildRoutes.create, { body })
};
