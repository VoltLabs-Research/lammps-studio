import { fileRoutes } from '@lammps-studio/contracts/file/routes';
import { create } from 'zustand';
import { RunFolder } from '@/modules/run-control/domain/run-control';
import { call } from '@/shared/api/call';
import { hasCode } from '@/shared/errors/has-code';

interface RunFilesState{
    key: string | null;
    wantedKey: string | null;
    count: number;
    error: unknown;
}

export const useRunFilesStore = create<RunFilesState>(() => ({
    key: null,
    wantedKey: null,
    count: 0,
    error: null
}));

const { getState: read, setState: write } = useRunFilesStore;

export const countRunFiles = async ({ simulationId, number, outputDir }: RunFolder) => {
    const key = `${simulationId}/${number}`;
    write({ wantedKey: key });
    try{
        const entries = await call(fileRoutes.list, { path: { simulationId }, query: { path: outputDir } });
        if(read().wantedKey === key) write({ key, count: entries.filter((entry) => !entry.directory).length, error: null });
    }catch(error){
        if(read().wantedKey !== key) return;

        write(hasCode(error, 'File::NotFound') ? { key, count: 0, error: null } : { error });
    }
};
