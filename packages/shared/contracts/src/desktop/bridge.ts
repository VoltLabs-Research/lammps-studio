export interface AgentEndpoint{
    url: string;
    token: string;
}

export interface WindowControls{
    close(): void;
    minimize(): void;
    toggleMaximize(): void;
}

export interface StudioBridge{
    agent: AgentEndpoint;
    platform: string;
    window: WindowControls;
}

export interface AgentReadyMessage{
    url: string;
    token: string;
    version: string;
}

export const AGENT_READY_PREFIX = 'LAMMPS_AGENT_READY ';
