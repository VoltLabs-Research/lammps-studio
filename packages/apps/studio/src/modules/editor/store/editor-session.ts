import { editorRoutes } from '@lammps-studio/contracts/editor/routes';
import { create } from 'zustand';
import { call } from '@/shared/api/call';
import { LoadStatus } from '@/shared/store/list-store';

interface EditorSessionState{
    simulationId: string | null;
    url: string | null;
    status: LoadStatus;
    error: unknown;
}

export const useEditorSessionStore = create<EditorSessionState>(() => ({
    simulationId: null,
    url: null,
    status: 'loading',
    error: null
}));

const { getState: read, setState: write } = useEditorSessionStore;

const start = async (simulationId: string) => {
    write({ simulationId, url: null, status: 'loading', error: null });
    try{
        const { url } = await call(editorRoutes.open, { path: { simulationId } });
        if(read().simulationId === simulationId) write({ url, status: 'ready' });
    }catch(error){
        if(read().simulationId === simulationId) write({ status: 'failed', error });
    }
};

export const openEditor = async (simulationId: string) => {
    if(read().simulationId === simulationId && read().status !== 'failed') return;

    await start(simulationId);
};

export const retryEditor = async () => {
    const { simulationId } = read();
    if(simulationId !== null) await start(simulationId);
};
