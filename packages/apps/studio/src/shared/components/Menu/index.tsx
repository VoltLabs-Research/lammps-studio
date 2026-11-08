import { KeyboardEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import MenuItem from '@/shared/components/MenuItem';
import { MENU_SEPARATOR, MenuAction, MenuAlign, MenuEntry, MenuHandle } from '@/shared/contracts/menu';
import { useMenuLayer } from '@/shared/hooks/use-menu-layer';
import { focusMenuItem } from '@/shared/utils/menu-keys';
import '@/shared/components/Menu/menu.css';

interface MenuProps{
    menu: MenuHandle;
    entries: MenuEntry[];
    width?: number;
    align?: MenuAlign;
}

const DEFAULT_WIDTH = 240;
const DISMISS_KEYS = ['Escape', 'Tab'];

const separatorKey = (entries: MenuEntry[], index: number): string => {
    const previous = entries[index - 1];

    return previous === MENU_SEPARATOR || previous === undefined ? `separator-${index}` : `separator-after-${previous.id}`;
};

const Menu = ({ menu, entries, width = DEFAULT_WIDTH, align = 'right' }: MenuProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const { anchor, close } = menu;
    useMenuLayer(ref, anchor, align, close);

    if(!anchor) return null;

    const dismiss = () => {
        close();
        if(anchor instanceof HTMLElement) anchor.focus();
    };

    const activate = (action: MenuAction) => {
        if(!action.keepOpen) dismiss();
        action.run();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if(DISMISS_KEYS.includes(event.key)){
            event.preventDefault();
            event.stopPropagation();
            dismiss();
            return;
        }

        if(focusMenuItem(event.key, event.currentTarget)) event.preventDefault();
    };

    return createPortal(
        <div ref={ref} className='popover glass menu' role='menu' tabIndex={-1} style={{ width }} onKeyDown={onKeyDown}>
            {entries.map((entry, index) => (entry === MENU_SEPARATOR
                ? <div key={separatorKey(entries, index)} className='menu-sep' role='separator' />
                : <MenuItem key={entry.id} action={entry} onActivate={activate} />))}
        </div>,
        document.body
    );
};

export default Menu;
