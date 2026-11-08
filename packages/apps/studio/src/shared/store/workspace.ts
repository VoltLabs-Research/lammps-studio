import { create } from 'zustand';
import { PanelId } from '@/shared/contracts/workspace';

interface WorkspaceState{
    panel: PanelId;
    panelOpen: boolean;
    openPanel: (panel: PanelId) => void;
    togglePanel: (panel: PanelId) => void;
    setPanelOpen: (panelOpen: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    panel: 'editor',
    panelOpen: true,
    openPanel: (panel) => set({ panel, panelOpen: true }),
    togglePanel: (panel) => set((state) => (state.panelOpen && state.panel === panel ? { panelOpen: false } : { panel, panelOpen: true })),
    setPanelOpen: (panelOpen) => set({ panelOpen })
}));
