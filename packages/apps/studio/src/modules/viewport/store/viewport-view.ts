import { create } from 'zustand';
import type { DisplaySettings, FrameCursor, FrameSpan } from '@/modules/viewport/domain/workspace';
import { endOfPlay, LIVE_CURSOR, playStep, startPlaying } from '@/modules/viewport/utils/frame-cursor';
import { runKeyOf, spanOf } from '@/modules/viewport/utils/viewed-frames';
import { useRunSessionStore } from '@/shared/store/run-session';

interface ViewportViewState extends DisplaySettings{
    runKey: string | null;
    cursor: FrameCursor;
    playing: boolean;
}

export type FrameMove = (cursor: FrameCursor, span: FrameSpan) => FrameCursor;

export const useViewportViewStore = create<ViewportViewState>(() => ({
    colorMode: 'structure',
    showBox: true,
    showAxes: true,
    atomScale: 1,
    runKey: null,
    cursor: LIVE_CURSOR,
    playing: false
}));

const { getState: read, setState: write } = useViewportViewStore;

export const cursorOf = (state: ViewportViewState, runKey: string | null): FrameCursor => (state.runKey === runKey ? state.cursor : LIVE_CURSOR);

export const setDisplay = (patch: Partial<DisplaySettings>) => write(patch);

const viewed = () => {
    const session = useRunSessionStore.getState();

    return { runKey: runKeyOf(session), span: spanOf(session) };
};

export const moveFrames = (move: FrameMove) => {
    const { runKey, span } = viewed();
    if(runKey === null || span.count === 0) return;

    write({ runKey, cursor: move(cursorOf(read(), runKey), span), playing: false });
};

export const togglePlay = () => {
    if(read().playing){
        write({ playing: false });
        return;
    }

    const { runKey, span } = viewed();
    if(runKey === null || span.count < 2) return;

    write({ runKey, cursor: startPlaying(cursorOf(read(), runKey), span), playing: true });
};

export const playTick = () => {
    const { runKey, span } = viewed();
    if(runKey !== read().runKey){
        write({ playing: false });
        return;
    }

    const next = playStep(read().cursor, span);
    if(next === null){
        write({ cursor: endOfPlay(span), playing: false });
        return;
    }

    write({ cursor: next });
};
