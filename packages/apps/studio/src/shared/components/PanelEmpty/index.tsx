import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import Empty from '@/shared/components/Empty';
import '@/shared/components/PanelEmpty/panel-empty.css';

interface PanelEmptyProps{
    icon: LucideIcon;
    title: string;
    spin?: boolean;
    children?: ReactNode;
}

const PanelEmpty = ({ icon, title, spin = false, children }: PanelEmptyProps) => (
    <div className='panel-empty'>
        <Empty icon={icon} title={title} spin={spin}>{children}</Empty>
    </div>
);

export default PanelEmpty;
