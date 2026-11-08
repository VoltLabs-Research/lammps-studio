import { RunSummary } from '../run/domain';

export type SimulationTemplate = 'empty' | 'example' | 'folder' | 'git';

export interface Simulation{
    id: string;
    name: string;
    machineId: string;
    folder: string;
    entry: string | null;
    createdAt: string;
    updatedAt: string;
    lastRun: RunSummary | null;
    hasPreview: boolean;
}
