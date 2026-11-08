import { ChevronRight, LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import Icon from '@/shared/components/Icon';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/Group/group.css';

interface GroupItemProps{
    title: ReactNode;
    sub?: ReactNode;
    subMono?: boolean;
    icon?: LucideIcon;
    value?: ReactNode;
    chevron?: boolean;
    action?: boolean;
    danger?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

const GroupItem = ({ title, sub, subMono = false, icon, value, chevron = false, action = false, danger = false, disabled = false, onClick }: GroupItemProps) => {
    const className = classNames('grow', action && 'grow--action', danger && 'danger-ink');
    const body = (
        <>
            {icon ? <span className='grow__icon'><Icon glyph={icon} size='sm' /></span> : null}
            {sub === undefined
                ? <span className='grow__title'>{title}</span>
                : (
                    <span className='grow__main'>
                        <span className='grow__title'>{title}</span>
                        <span className={classNames('grow__sub', subMono && 'mono')}>{sub}</span>
                    </span>
                )}
            {value === undefined ? null : <span className='grow__value'>{value}</span>}
            {chevron ? <span className='grow__chev'><Icon glyph={ChevronRight} size='sm' /></span> : null}
        </>
    );

    if(!onClick && !disabled) return <div className={className}>{body}</div>;

    return <button type='button' className={className} disabled={disabled} onClick={onClick}>{body}</button>;
};

export default GroupItem;
