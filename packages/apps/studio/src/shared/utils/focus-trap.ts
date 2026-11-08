const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(', ');

export const focusablesIn = (root: HTMLElement): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));

export const trapTab = (event: KeyboardEvent, root: HTMLElement) => {
    const focusables = focusablesIn(root);
    const first = focusables.at(0);
    const last = focusables.at(-1);
    if(!first || !last){
        event.preventDefault();
        return;
    }

    const active = document.activeElement;
    if(event.shiftKey && (active === first || active === root)){
        event.preventDefault();
        last.focus();
        return;
    }

    if(!event.shiftKey && active === last){
        event.preventDefault();
        first.focus();
    }
};
