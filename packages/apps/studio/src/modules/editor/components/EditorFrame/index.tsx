import { LoaderCircle } from 'lucide-react';
import EditorUnavailable from '@/modules/editor/components/EditorUnavailable';
import { useEditorSessionStore } from '@/modules/editor/store/editor-session';
import PanelEmpty from '@/shared/components/PanelEmpty';
import '@/modules/editor/components/EditorFrame/editor-frame.css';

interface EditorFrameProps{
    simulationId: string;
}

const EditorFrame = ({ simulationId }: EditorFrameProps) => {
    const { simulationId: opened, url, status, error } = useEditorSessionStore();
    const current = opened === simulationId;
    if(current && status === 'failed') return <EditorUnavailable error={error} />;
    if(!current || url === null) return <PanelEmpty icon={LoaderCircle} spin title='Opening VS Code' />;

    return <iframe className='editor-frame' src={url} title='VS Code' />;
};

export default EditorFrame;
