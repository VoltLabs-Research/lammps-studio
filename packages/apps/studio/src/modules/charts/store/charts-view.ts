import { create } from 'zustand';
import type { PlotMode } from '@/modules/charts/domain/chart';

interface ChartsViewState{
    plotMode: PlotMode;
    featured: string | null;
    setPlotMode: (plotMode: PlotMode) => void;
    setFeatured: (featured: string) => void;
}

export const useChartsViewStore = create<ChartsViewState>((set) => ({
    plotMode: 'both',
    featured: null,
    setPlotMode: (plotMode) => set({ plotMode }),
    setFeatured: (featured) => set({ featured })
}));
