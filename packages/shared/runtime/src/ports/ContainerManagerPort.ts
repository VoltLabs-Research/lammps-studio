export interface ContainerHandle{
    id: string;
}

export interface ContainerCreateRequest{
    image: string;
    name: string;
    argv: string[];
    workingDir: string;
    binds: string[];
    env: Record<string, string>;
    labels: Record<string, string>;
    user: string | null;
    gpus: number;
}

export interface ContainerWaitResult{
    exitCode: number | null;
}

export type RunContainerState = 'created' | 'running' | 'exited';

export interface RunContainer{
    id: string;
    image: string;
    simulationId: string;
    runNumber: number;
    runDir: string;
    state: RunContainerState;
    exitCode: number | null;
    startedAt: string | null;
}

export interface ContainerManagerPort{
    create(request: ContainerCreateRequest): Promise<ContainerHandle>;
    start(container: ContainerHandle): Promise<void>;
    wait(container: ContainerHandle): Promise<ContainerWaitResult>;
    stop(container: ContainerHandle, timeoutSeconds: number): Promise<void>;
    remove(container: ContainerHandle): Promise<void>;
    inspect(containerId: string): Promise<RunContainer>;
    list(): Promise<RunContainer[]>;
}
