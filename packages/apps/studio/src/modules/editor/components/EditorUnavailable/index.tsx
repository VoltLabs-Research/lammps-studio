import { FileCode } from 'lucide-react';
import { retryEditor } from '@/modules/editor/store/editor-session';
import { editorErrorCopy } from '@/modules/editor/utils/error-messages';
import Button from '@/shared/components/Button';
import PanelEmpty from '@/shared/components/PanelEmpty';

interface EditorUnavailableProps{
    error: unknown;
}

const EditorUnavailable = ({ error }: EditorUnavailableProps) => (
    <PanelEmpty icon={FileCode} title='VS Code isn’t available'>
        <p>{editorErrorCopy(error)}</p>
        <Button size='sm' onClick={() => void retryEditor()}>Try again</Button>
    </PanelEmpty>
);

export default EditorUnavailable;
