import { create } from 'zustand';

export type SettingsTab = 'general' | 'machines' | 'builds';

interface SettingsViewState{
    tab: SettingsTab;
    machineId: string | null;
    showTab: (tab: SettingsTab) => void;
    showMachine: (machineId: string | null) => void;
}

export const useSettingsView = create<SettingsViewState>((set) => ({
    tab: 'general',
    machineId: null,
    showTab: (tab) => set({ tab, machineId: null }),
    showMachine: (machineId) => set({ tab: 'machines', machineId })
}));
