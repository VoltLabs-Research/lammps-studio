import { create } from 'zustand';
import type { VariablesTab } from '@/modules/variables/domain/variables';

interface VariablesViewState{
    tab: VariablesTab;
    setTab: (tab: VariablesTab) => void;
}

export const useVariablesViewStore = create<VariablesViewState>((set) => ({
    tab: 'variables',
    setTab: (tab) => set({ tab })
}));
