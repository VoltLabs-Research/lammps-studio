import { KeyboardEvent, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MenuItem from '@/shared/components/MenuItem';
import { MENU_SEPARATOR, MenuAction, MenuAlign, MenuEntry, MenuHandle } from '@/shared/contracts/menu';
import { anchorRectOf, placeMenu } from '@/shared/utils/menu-position';
import '@/shared/components/Menu/menu.css';

interface MenuProps{
    menu: MenuHandle;
    entries: MenuEntry[];
    width?: number;
    align?: MenuAlign;
}

const DEFAULT_WIDTH = 240;
const ITEM_SELECTOR = '[role^="menuitem"]:not([disabled])';

const nextIndex = (key: string, current: number, count: number): number | null => {
    if(key === 'Home') return 0;
    if(key === 'End') return count - 1;
    if(key === 'ArrowDown') return (current + 1) % count;
    if(key === 'ArrowUp') return current < 0 ? count - 1 : (current - 1 + count) % count;

    return null;
};

const separatorKey = (entries: MenuEntry[], index: number): string => {
    const previous = entries[index - 1];

    return previous === MENU_SEPARATOR || previous === undefined ? `separator-${index}` : `separator-after-${previous.id}`;
};

const Menu = ({ menu, entries, width = DEFAULT_WIDTH, align = 'right' }: MenuProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const { anchor, close } = menu;

    useLayoutEffect(() => {
        const element = ref.current;
        if(!element || !anchor) return;

        const position = placeMenu(
            anchorRectOf(anchor),
            { width: element.offsetWidth, height: element.offsetHeight },
            { width: window.innerWidth, height: window.innerHeight },
            anchor instanceof HTMLElement ? align : 'left'
        );
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;
        element.focus({ preventScroll: true });
    }, [anchor, align]);

    useEffect(() => {
        if(!anchor) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target;
            if(!(target instanceof Node) || ref.current?.contains(target)) return;
            if(anchor instanceof HTMLElement && anchor.contains(target)) return;

            close();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('resize', close);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('resize', close);
        };
    }, [anchor, close]);

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
        if(event.key === 'Escape' || event.key === 'Tab'){
            event.preventDefault();
            event.stopPropagation();
            dismiss();
            return;
        }

        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR));
        const index = nextIndex(event.key, items.findIndex((item) => item === document.activeElement), items.length);
        if(index === null || items.length === 0) return;

        event.preventDefault();
        items[index].focus();
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
