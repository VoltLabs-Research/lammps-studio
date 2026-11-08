import { ChevronsUpDown } from 'lucide-react';
import { KeyboardEvent } from 'react';
import Icon from '@/shared/components/Icon';
import Menu from '@/shared/components/Menu';
import { MenuEntry } from '@/shared/contracts/menu';
import { useMenu } from '@/shared/hooks/use-menu';
import '@/shared/components/Popup/popup.css';

interface PopupProps{
    label: string;
    value: string;
    entries: MenuEntry[];
    width?: number;
    disabled?: boolean;
}

const DEFAULT_WIDTH = 230;
const OPEN_KEYS = ['ArrowDown', 'ArrowUp'];

const Popup = ({ label, value, entries, width = DEFAULT_WIDTH, disabled = false }: PopupProps) => {
    const menu = useMenu();

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if(!OPEN_KEYS.includes(event.key) || menu.anchor) return;

        event.preventDefault();
        menu.toggle(event.currentTarget);
    };

    return (
        <>
            <button
                type='button'
                className='popup'
                aria-haspopup='menu'
                aria-expanded={menu.anchor !== null}
                aria-label={`${label}: ${value}`}
                disabled={disabled}
                onClick={(event) => menu.toggle(event.currentTarget)}
                onKeyDown={onKeyDown}
            >
                <span>{value}</span>
                <Icon glyph={ChevronsUpDown} size='xs' />
            </button>
            <Menu menu={menu} entries={entries} width={width} />
        </>
    );
};

export default Popup;
