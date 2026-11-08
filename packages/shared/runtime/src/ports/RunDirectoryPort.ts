import type { PreparedRun } from '../domain/simulation/RunSpec';

export interface RunDirectoryPort{
    prepare(simulationDir: string, entry: string): Promise<PreparedRun>;
}
