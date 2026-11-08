export type BuildStatus = 'ready' | 'building' | 'failed';

export type BuildStepState = 'done' | 'active' | 'pending';

export interface BuildStep{
    name: string;
    state: BuildStepState;
    detail: string | null;
}

export interface Build{
    hash: string;
    machineId: string;
    version: string;
    packages: string[];
    image: string;
    sizeBytes: number | null;
    status: BuildStatus;
    progress: number;
    steps: BuildStep[];
    output: string | null;
    buildSeconds: number | null;
    usedBy: number;
    createdAt: string;
}
