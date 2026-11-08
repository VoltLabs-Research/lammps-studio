import { ReactNode } from 'react';
import '@/shared/components/Group/group.css';

interface GroupRowProps{
    label: ReactNode;
    children: ReactNode;
}

const GroupRow = ({ label, children }: GroupRowProps) => (
    <div className='grow'>
        <span className='grow__title'>{label}</span>
        <span className='grow__ctl'>{children}</span>
    </div>
);

export default GroupRow;
