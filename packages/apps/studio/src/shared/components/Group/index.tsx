import { ReactNode } from 'react';
import '@/shared/components/Group/group.css';

interface GroupProps{
    title?: string;
    foot?: ReactNode;
    children: ReactNode;
}

const Group = ({ title, foot, children }: GroupProps) => (
    <section className='gsec'>
        {title ? <h3 className='group-title'>{title}</h3> : null}
        <div className='group'>{children}</div>
        {foot ? <p className='group-foot'>{foot}</p> : null}
    </section>
);

export default Group;
