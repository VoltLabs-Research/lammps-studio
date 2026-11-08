import { Simulation } from '@lammps-studio/contracts/simulation/domain';

export type SimulationRecord = Pick<Simulation, 'id' | 'name' | 'entry' | 'createdAt' | 'updatedAt'>;

export interface StoredSimulation{
    folder: string;
    path: string;
    record: SimulationRecord;
}

export type FolderFill = (path: string) => Promise<void>;
