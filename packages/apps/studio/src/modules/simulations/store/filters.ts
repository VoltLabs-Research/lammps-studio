import { StatusFilter } from '@/modules/simulations/utils/status-filters';
import { create } from 'zustand';

interface FiltersState{
    status: StatusFilter;
    machineId: string | null;
    setStatus: (status: StatusFilter) => void;
    showMachine: (machineId: string | null) => void;
    showAllMachines: () => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
    status: 'all',
    machineId: null,
    setStatus: (status) => set({ status }),
    showMachine: (machineId) => set({ machineId, status: 'all' }),
    showAllMachines: () => set({ machineId: null })
}));
