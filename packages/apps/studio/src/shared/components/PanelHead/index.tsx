import { ReactNode } from 'react';
import '@/shared/components/PanelHead/panel-head.css';

interface PanelHeadProps{
    title: string;
    sub?: ReactNode;
    children?: ReactNode;
}

const PanelHead = ({ title, sub, children }: PanelHeadProps) => (
    <div className='panel__head'>
        <span className='panel__title'>{title}</span>
        <span className='panel__sub'>{sub}</span>
        <div className='panel__actions'>{children}</div>
    </div>
);

export default PanelHead;
