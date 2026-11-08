import { StudioBridge } from '@lammps-studio/contracts/desktop/bridge';

declare global{
    interface Window{
        studio?: StudioBridge;
    }

    interface ImportMetaEnv{
        readonly VITE_AGENT_URL?: string;
        readonly VITE_AGENT_TOKEN?: string;
    }
}
