import { create } from 'zustand';

export type View = 'dashboard' | 'workspace';

interface NavigationState{
    view: View;
    simulationId: string | null;
    openWorkspace: (simulationId: string) => void;
    openDashboard: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    view: 'dashboard',
    simulationId: null,
    openWorkspace: (simulationId) => set({ view: 'workspace', simulationId }),
    openDashboard: () => set({ view: 'dashboard' })
}));
