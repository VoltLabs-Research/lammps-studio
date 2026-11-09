import { useEffect } from 'react';
import { WorkspaceKey } from '@/app/contracts/workspace-keys';
import { isInControl, workspaceKeyOf } from '@/app/utils/workspace-keys';
import { checkInput, startRun, stopRun } from '@/modules/run-control/utils/run-actions';
import { moveFrames } from '@/modules/viewport/store/viewport-view';
import { stepBack, stepForward } from '@/modules/viewport/utils/frame-cursor';
import { PanelId } from '@/shared/contracts/workspace';
import { useModalStore } from '@/shared/store/modal';
import { useWorkspaceStore } from '@/shared/store/workspace';

const open = (panel: PanelId) => () => useWorkspaceStore.getState().openPanel(panel);

const ACTIONS: Record<WorkspaceKey, () => void> = {
    run: () => void startRun(),
    stop: () => void stopRun(),
    check: () => void checkInput(),
    output: open('output'),
    charts: open('charts'),
    variables: open('variables'),
    'previous-frame': () => moveFrames(stepBack),
    'next-frame': () => moveFrames(stepForward)
};

export const useWorkspaceKeys = () => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if(event.defaultPrevented || useModalStore.getState().stack.length > 0) return;

            const action = workspaceKeyOf({
                key: event.key,
                mod: event.ctrlKey || event.metaKey,
                shift: event.shiftKey,
                alt: event.altKey,
                inControl: isInControl(event.target)
            });
            if(action === null) return;

            event.preventDefault();
            ACTIONS[action]();
        };
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);
};
