import { FileCode } from 'lucide-react';
import Button from '@/shared/components/Button';
import PanelEmpty from '@/shared/components/PanelEmpty';
import { copyText } from '@/shared/services/clipboard';

interface EditorExternalProps{
    folder: string;
}

const EditorExternal = ({ folder }: EditorExternalProps) => (
    <PanelEmpty icon={FileCode} title='Files open in your editor'>
        <p className='mono'>{folder}</p>
        <Button size='sm' onClick={() => void copyText(folder, 'Copied the path')}>Copy path</Button>
    </PanelEmpty>
);

export default EditorExternal;
