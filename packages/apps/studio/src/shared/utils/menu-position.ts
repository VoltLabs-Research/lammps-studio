import { MenuAlign, MenuAnchor, Point } from '@/shared/contracts/menu';

export interface AnchorRect{
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface BoxSize{
    width: number;
    height: number;
}

const GAP = 6;
const MARGIN = 8;

export const anchorRectOf = (anchor: MenuAnchor): AnchorRect => {
    if(anchor instanceof HTMLElement) return anchor.getBoundingClientRect();

    return {
        left: anchor.x,
        right: anchor.x,
        top: anchor.y - GAP,
        bottom: anchor.y - GAP
    };
};

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export const placeMenu = (rect: AnchorRect, menu: BoxSize, viewport: BoxSize, align: MenuAlign): Point => {
    const preferredLeft = align === 'right' ? rect.right - menu.width : rect.left;
    const below = rect.bottom + GAP;
    const fitsBelow = below + menu.height <= viewport.height - MARGIN;

    return {
        x: clamp(preferredLeft, MARGIN, viewport.width - menu.width - MARGIN),
        y: fitsBelow ? below : Math.max(MARGIN, rect.top - menu.height - GAP)
    };
};
