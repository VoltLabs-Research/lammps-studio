import { AgentEndpoint } from '@lammps-studio/contracts/desktop/bridge';

export const agentEndpoint = (): AgentEndpoint | null => {
    if(window.studio) return window.studio.agent;

    const url = import.meta.env.VITE_AGENT_URL;
    const token = import.meta.env.VITE_AGENT_TOKEN;
    if(!url || !token) return null;

    return { url, token };
};
