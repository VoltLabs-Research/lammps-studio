import { RunConfig } from '@lammps-studio/contracts/run/domain';
import { create } from 'zustand';

interface RunDraftState{
    simulationId: string | null;
    config: RunConfig | null;
    setDraft: (simulationId: string, config: RunConfig) => void;
    patchDraft: (patch: Partial<RunConfig>) => void;
    setVariable: (name: string, value: string) => void;
    clearDraft: () => void;
}

const withVariable = (variables: Record<string, string>, name: string, value: string): Record<string, string> => {
    const { [name]: _, ...rest } = variables;

    return value.trim() === '' ? rest : { ...rest, [name]: value };
};

export const useRunDraftStore = create<RunDraftState>((set) => ({
    simulationId: null,
    config: null,
    setDraft: (simulationId, config) => set({ simulationId, config }),
    patchDraft: (patch) => set((state) => (state.config ? { config: { ...state.config, ...patch } } : state)),
    setVariable: (name, value) => set((state) => {
        if(!state.config) return state;

        return { config: { ...state.config, variables: withVariable(state.config.variables, name, value) } };
    }),
    clearDraft: () => set({ simulationId: null, config: null })
}));
