import { KeyChord, WorkspaceKey } from '@/app/contracts/workspace-keys';

const MOD_KEYS: Record<string, WorkspaceKey> = {
    enter: 'run',
    '.': 'stop'
};

const MOD_SHIFT_KEYS: Record<string, WorkspaceKey> = {
    k: 'check',
    l: 'output',
    c: 'charts',
    v: 'variables'
};

const ARROW_KEYS: Record<string, WorkspaceKey> = {
    arrowleft: 'previous-frame',
    arrowright: 'next-frame'
};

const CONTROLS = 'input, textarea, select, [contenteditable="true"], [role="separator"], [role="slider"], [role="menu"], [role="listbox"]';

export const isInControl = (target: EventTarget | null): boolean => target instanceof Element && target.closest(CONTROLS) !== null;

export const workspaceKeyOf = ({ key, mod, shift, alt, inControl }: KeyChord): WorkspaceKey | null => {
    const name = key.toLowerCase();
    if(alt) return null;
    if(mod) return (shift ? MOD_SHIFT_KEYS[name] : MOD_KEYS[name]) ?? null;
    if(shift || inControl) return null;

    return ARROW_KEYS[name] ?? null;
};
