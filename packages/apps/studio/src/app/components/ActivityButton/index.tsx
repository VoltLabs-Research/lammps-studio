import { LucideIcon } from 'lucide-react';
import Icon from '@/shared/components/Icon';
import { classNames } from '@/shared/utils/class-names';

export type BadgeTone = 'info' | 'warn';

interface ActivityButtonProps{
    label: string;
    tip: string;
    icon: LucideIcon;
    pressed?: boolean;
    badge: number;
    badgeTone?: BadgeTone;
    onClick: () => void;
}

const ActivityButton = ({ label, tip, icon, pressed, badge, badgeTone = 'info', onClick }: ActivityButtonProps) => (
    <button type='button' className='act' aria-pressed={pressed} aria-label={label} data-tip={tip} data-tip-side='right' onClick={onClick}>
        <Icon glyph={icon} size='lg' />
        {badge > 0 ? <span className={classNames('act__badge', badgeTone === 'warn' && 'warn')}>{badge}</span> : null}
    </button>
);

export default ActivityButton;
