export interface ContainerHandle{
    id: string;
    raw?: unknown;
}

export interface ContainerCreateRequest{
    imageTag: string;
    name: string;
    command: string;
    workingDir: string;
    shell: string;
    binds: string[];
    env: Record<string, string>;
    labels: Record<string, string>;
    cpus?: number;
    memory?: string;
    gpus?: 'all' | number;
}

export interface ContainerWaitResult{
    exitCode: number | null;
}

export interface ContainerManagerPort{
    create(request: ContainerCreateRequest): Promise<ContainerHandle>;
    get(id: string): ContainerHandle;
    start(container: ContainerHandle): Promise<void>;
    wait(container: ContainerHandle): Promise<ContainerWaitResult>;
    stop(container: ContainerHandle, timeoutSeconds: number): Promise<void>;
    kill(container: ContainerHandle): Promise<void>;
    remove(container: ContainerHandle): Promise<void>;
}
