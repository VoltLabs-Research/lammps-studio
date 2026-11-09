import { LucideIcon } from 'lucide-react';

export interface Point{
    x: number;
    y: number;
}

export type MenuAnchor = HTMLElement | Point;

export type MenuAlign = 'left' | 'right';

export interface MenuAction{
    id: string;
    label: string;
    icon?: LucideIcon;
    hint?: string;
    kbd?: string;
    checked?: boolean;
    disabled?: boolean;
    danger?: boolean;
    keepOpen?: boolean;
    run: () => void;
}

export interface MenuCaption{
    caption: string;
}

export const MENU_SEPARATOR = 'separator';

export type MenuEntry = MenuAction | MenuCaption | typeof MENU_SEPARATOR;

export interface OpenMenu{
    key: string;
    anchor: MenuAnchor;
}

export interface MenuHandle{
    anchor: MenuAnchor | null;
    toggle: (element: HTMLElement) => void;
    openAt: (point: Point) => void;
    close: () => void;
}
