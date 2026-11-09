import { useEffect } from 'react';
import EditorExternal from '@/modules/editor/components/EditorExternal';
import EditorFrame from '@/modules/editor/components/EditorFrame';
import { openEditor } from '@/modules/editor/store/editor-session';
import { folderOf } from '@/modules/simulations/utils/simulation-actions';
import { useMachinesStore } from '@/shared/store/machines';
import { usePreferencesStore } from '@/shared/store/preferences';
import { useRunSessionStore } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';

const EditorPanel = () => {
    const simulationId = useRunSessionStore((state) => state.simulationId);
    const editor = usePreferencesStore((state) => state.editor);
    const simulation = useSimulationsStore((state) => state.items.find((item) => item.id === simulationId));
    const machine = useMachinesStore((state) => state.items.find((item) => item.id === simulation?.machineId));

    useEffect(() => {
        if(simulationId !== null && editor === 'studio') void openEditor(simulationId);
    }, [simulationId, editor]);

    if(simulationId === null) return <div className='panel__body' />;
    if(editor === 'external'){
        return <div className='panel__body'>{simulation ? <EditorExternal folder={folderOf(simulation, machine)} /> : null}</div>;
    }

    return <div className='panel__body'><EditorFrame simulationId={simulationId} /></div>;
};

export default EditorPanel;
