import { create } from 'zustand';
import { LogFilter } from '@/modules/output/domain/log';

interface OutputViewState{
    filter: LogFilter;
    follow: boolean;
    setFilter: (filter: LogFilter) => void;
    setFollow: (follow: boolean) => void;
}

export const useOutputViewStore = create<OutputViewState>((set) => ({
    filter: 'all',
    follow: true,
    setFilter: (filter) => set({ filter }),
    setFollow: (follow) => set({ follow })
}));
