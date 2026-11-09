import { createRef } from 'react';
import type { AtomViewportHandle } from '@/modules/viewport/domain/components';
import { cursorOf, useViewportViewStore } from '@/modules/viewport/store/viewport-view';
import { shownPosition } from '@/modules/viewport/utils/frame-cursor';
import { runKeyOf } from '@/modules/viewport/utils/viewed-frames';
import { saveBlob } from '@/shared/services/save-file';
import { useRunSessionStore } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';
import { toast } from '@/shared/store/toast';

export const workspaceViewport = createRef<AtomViewportHandle>();

const shotName = (): string => {
    const session = useRunSessionStore.getState();
    const folder = useSimulationsStore.getState().items.find((item) => item.id === session.simulationId)?.folder ?? 'viewport';
    const position = shownPosition(cursorOf(useViewportViewStore.getState(), runKeyOf(session)), session.frames.length);
    const step = session.frames[position]?.step ?? 0;

    return `${folder}-step-${step}.png`;
};

export const saveViewportImage = async () => {
    const handle = workspaceViewport.current;
    if(!handle) return;

    const name = shotName();
    try{
        saveBlob(await handle.snapshot(), name);
        toast(`Saved ${name}`);
    }catch{
        toast('Could not save the image');
    }
};
