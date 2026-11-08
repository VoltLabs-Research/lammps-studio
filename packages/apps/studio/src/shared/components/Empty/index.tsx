import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/shared/components/Icon';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/Empty/empty.css';

interface EmptyProps{
    icon: LucideIcon;
    title: string;
    className?: string;
    children?: ReactNode;
}

const Empty = ({ icon, title, className, children }: EmptyProps) => (
    <div className={classNames('empty', className)}>
        <div className='empty__icon'>
            <Icon glyph={icon} />
        </div>
        <h3>{title}</h3>
        {children}
    </div>
);

export default Empty;
