import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/shared/components/Icon';
import '@/modules/variables/components/ScriptRow/script-row.css';

interface ScriptRowProps{
    icon: LucideIcon;
    id: string;
    meta: string;
    detail: string;
    mono?: boolean;
    aside?: ReactNode;
}

const ScriptRow = ({ icon, id, meta, detail, mono = false, aside }: ScriptRowProps) => (
    <div className='list-row'>
        <div className='list-row__icon'><Icon glyph={icon} size='sm' /></div>
        <div className='list-row__main'>
            <span><span className='mono'>{id}</span> <span className='muted'>· {meta}</span></span>
            <span className={mono ? 'mono' : undefined}>{detail}</span>
        </div>
        {aside}
    </div>
);

export default ScriptRow;
