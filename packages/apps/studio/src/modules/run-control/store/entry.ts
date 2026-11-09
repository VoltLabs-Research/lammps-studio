import { EntryCandidate } from '@lammps-studio/contracts/script/domain';
import { create } from 'zustand';
import { runApi } from '@/modules/run-control/api/api';
import { LoadStatus } from '@/shared/store/list-store';

interface EntryState{
    simulationId: string | null;
    candidates: EntryCandidate[];
    status: LoadStatus;
    error: unknown;
    pickingFor: string | null;
}

export const useEntryStore = create<EntryState>(() => ({
    simulationId: null,
    candidates: [],
    status: 'loading',
    error: null,
    pickingFor: null
}));

const { getState: read, setState: write } = useEntryStore;

const NO_CANDIDATES: EntryCandidate[] = [];

export const candidatesOf = (simulationId: string) => (state: EntryState): EntryCandidate[] => (state.simulationId === simulationId ? state.candidates : NO_CANDIDATES);

export const loadEntryCandidates = async (simulationId: string) => {
    if(read().simulationId === simulationId && read().status !== 'failed') return;

    write({ simulationId, candidates: [], status: 'loading', error: null });
    try{
        const candidates = await runApi.entryCandidates(simulationId);
        if(read().simulationId === simulationId) write({ candidates, status: 'ready' });
    }catch(error){
        if(read().simulationId === simulationId) write({ status: 'failed', error });
    }
};

export const startPicking = (simulationId: string) => write({ pickingFor: simulationId });

export const stopPicking = () => write({ pickingFor: null });
