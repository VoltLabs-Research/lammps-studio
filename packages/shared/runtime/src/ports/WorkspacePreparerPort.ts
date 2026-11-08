import type { SimulationSpec } from '../domain/simulation/SimulationSpec';

export interface PreparedWorkspace{
    outputDir: string;
    workspaceDir: string;
    inputDir: string;
    mainInputHostPath: string;
    mainInputContainerPath: string;
}

export interface WorkspacePreparerPort{
    prepare(runId: string, spec: SimulationSpec): Promise<PreparedWorkspace>;
    cleanup(workspace: PreparedWorkspace): Promise<void>;
}
