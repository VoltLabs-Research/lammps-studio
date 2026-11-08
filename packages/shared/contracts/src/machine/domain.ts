export type MachineKind = 'local' | 'ssh' | 'slurm';

export type MachineStatus = 'online' | 'offline';

export interface Machine{
    id: string;
    name: string;
    kind: MachineKind;
    status: MachineStatus;
    host: string;
    os: string;
    cpu: string;
    cores: number;
    memory: string;
    gpus: number;
    runtime: string;
    scheduler: string | null;
    agentVersion: string;
    root: string;
    diskFree: string;
    offlineSince: string | null;
}
