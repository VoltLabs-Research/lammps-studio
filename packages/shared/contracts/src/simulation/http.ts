import { SimulationTemplate } from './domain';

export interface CreateSimulationInput{
    name: string;
    machineId: string;
    template: SimulationTemplate;
    source: string | null;
}

export interface UpdateSimulationInput{
    name?: string;
    entry?: string;
}
