import { RunConfig } from '@lammps-studio/contracts/run/domain';
import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { call } from '@/shared/api/call';

export const runApi = {
    start: (simulationId: string, config: RunConfig) => call(runRoutes.start, { path: { simulationId }, body: { config } }),

    stop: (simulationId: string, runNumber: number, kill: boolean) => call(runRoutes.stop, { path: { simulationId, runNumber }, body: { kill } }),

    entryCandidates: (simulationId: string) => call(simulationRoutes.entryCandidates, { path: { simulationId } }),

    setEntry: (simulationId: string, entry: string) => call(simulationRoutes.update, { path: { simulationId }, body: { entry } })
};
