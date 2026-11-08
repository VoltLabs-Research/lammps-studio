const ITEM_SELECTOR = '[role^="menuitem"]:not([disabled])';

const nextIndex = (key: string, current: number, count: number): number | null => {
    if(key === 'Home') return 0;
    if(key === 'End') return count - 1;
    if(key === 'ArrowDown') return (current + 1) % count;
    if(key === 'ArrowUp') return current < 0 ? count - 1 : (current - 1 + count) % count;

    return null;
};

export const focusMenuItem = (key: string, menu: HTMLElement): boolean => {
    const items = Array.from(menu.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR));
    const index = nextIndex(key, items.findIndex((item) => item === document.activeElement), items.length);
    if(index === null || items.length === 0) return false;

    items[index].focus();

    return true;
};
