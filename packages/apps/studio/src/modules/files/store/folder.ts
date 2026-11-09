import { fileRoutes } from '@lammps-studio/contracts/file/routes';
import { create } from 'zustand';
import type { FolderState } from '@/modules/files/domain/files';
import { finderOrder, parentOf } from '@/modules/files/utils/finder';
import { call } from '@/shared/api/call';
import { hasCode } from '@/shared/errors/has-code';

const ROOT = '';

export const useFolderStore = create<FolderState>(() => ({
    simulationId: null,
    path: ROOT,
    entries: [],
    status: 'loading',
    error: null,
    selected: null
}));

const { getState: read, setState: write } = useFolderStore;

const isShowing = (simulationId: string, path: string): boolean => {
    const state = read();

    return state.simulationId === simulationId && state.path === path;
};

const load = async (simulationId: string, path: string) => {
    try{
        const entries = await call(fileRoutes.list, { path: { simulationId }, query: { path } });
        if(isShowing(simulationId, path)) write({ entries: finderOrder(entries), status: 'ready', error: null });
    }catch(error){
        if(!isShowing(simulationId, path)) return;
        if(path !== ROOT && hasCode(error, 'File::NotFound')){
            void openFolder(simulationId, parentOf(path));
            return;
        }

        write({ status: 'failed', error });
    }
};

export const openFolder = async (simulationId: string, path: string) => {
    write({ simulationId, path, entries: [], status: 'loading', error: null, selected: null });
    await load(simulationId, path);
};

export const refreshFolder = async () => {
    const { simulationId, path } = read();
    if(simulationId !== null) await load(simulationId, path);
};

export const selectEntry = (selected: string | null) => write({ selected });
