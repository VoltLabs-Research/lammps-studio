import { Check } from 'lucide-react';
import Icon from '@/shared/components/Icon';
import Kbd from '@/shared/components/Kbd';
import { MenuAction } from '@/shared/contracts/menu';
import { classNames } from '@/shared/utils/class-names';
import '@/shared/components/MenuItem/menu-item.css';

interface MenuItemProps{
    action: MenuAction;
    onActivate: (action: MenuAction) => void;
}

const MenuItem = ({ action, onActivate }: MenuItemProps) => {
    const checkable = action.checked !== undefined;

    return (
        <button
            type='button'
            role={checkable ? 'menuitemcheckbox' : 'menuitem'}
            aria-checked={action.checked}
            className={classNames('menu-item', action.danger && 'danger')}
            disabled={action.disabled}
            tabIndex={-1}
            onClick={() => onActivate(action)}
        >
            {checkable ? <span className='menu-check'>{action.checked ? <Icon glyph={Check} size='sm' /> : null}</span> : null}
            {action.icon ? <Icon glyph={action.icon} size='sm' /> : null}
            <span>{action.label}</span>
            {action.hint ? <small className='menu-hint'>{action.hint}</small> : null}
            {action.kbd ? <Kbd>{action.kbd}</Kbd> : null}
        </button>
    );
};

export default MenuItem;
