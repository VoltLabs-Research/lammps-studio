import { runRoutes } from '@lammps-studio/contracts/run/routes';
import type { Frame } from '@lammps-studio/contracts/run/frame';
import { decodeFrame } from '@lammps-studio/lammps/dump/frame-codec';
import { create } from 'zustand';
import type { FrameTarget } from '@/modules/viewport/domain/workspace';
import { runErrorCopy } from '@/modules/run-control/utils/error-messages';
import { call } from '@/shared/api/call';
import { toast } from '@/shared/store/toast';

interface FrameDataState{
    shownKey: string | null;
    frame: Frame | null;
    wantedKey: string | null;
}

export const useFrameDataStore = create<FrameDataState>(() => ({
    shownKey: null,
    frame: null,
    wantedKey: null
}));

const { getState: read, setState: write } = useFrameDataStore;

const keyOf = ({ simulationId, runNumber, frame }: FrameTarget): string => `${simulationId}/${runNumber}/${frame.index}`;

export const loadFrame = async (target: FrameTarget) => {
    const key = keyOf(target);
    if(read().shownKey === key || read().wantedKey === key) return;

    write({ wantedKey: key });
    try{
        const buffer = await call(runRoutes.frame, { path: { simulationId: target.simulationId, runNumber: target.runNumber, frameIndex: target.frame.index } });
        if(read().wantedKey === key) write({ shownKey: key, frame: decodeFrame(buffer), wantedKey: null });
    }catch(error){
        if(read().wantedKey !== key) return;

        write({ wantedKey: null });
        toast(runErrorCopy(error));
    }
};

export const frameFor = (state: FrameDataState, runKey: string | null): Frame | null => {
    if(runKey === null || !state.shownKey?.startsWith(`${runKey}/`)) return null;

    return state.frame;
};
