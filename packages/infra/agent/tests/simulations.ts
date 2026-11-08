import { config } from '@/config';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { CreateSimulationInput } from '@lammps-studio/contracts/simulation/http';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { join } from 'node:path';
import { expect } from 'vitest';
import { AgentApp } from './harness';
import { request } from './request';

export const createSimulation = async (app: AgentApp, input: Partial<CreateSimulationInput>): Promise<Simulation> => {
    const res = await request(app, simulationRoutes.create, {
        body: {
            name: 'Untitled',
            machineId: 'local',
            template: 'empty',
            source: null,
            ...input
        }
    });

    expect(res.status).toBe(201);
    return res.data();
};

export const folderOf = (simulation: Simulation): string => join(config.simulationsDir, simulation.folder);
