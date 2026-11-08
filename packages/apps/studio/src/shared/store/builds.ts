import { buildRoutes } from '@lammps-studio/contracts/build/routes';
import { call } from '@/shared/api/call';
import { createListStore } from '@/shared/store/list-store';

export const useBuildsStore = createListStore(() => call(buildRoutes.list), (build) => build.hash);
