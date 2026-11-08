import { anchorRectOf, placeMenu } from '@/shared/utils/menu-position';
import { describe, expect, it } from 'vitest';

const VIEWPORT = { width: 1000, height: 800 };
const MENU = { width: 200, height: 120 };

describe('placeMenu', () => {
    it('right-aligns below the anchor', () => {
        expect(placeMenu({ left: 500, right: 600, top: 100, bottom: 130 }, MENU, VIEWPORT, 'right')).toEqual({ x: 400, y: 136 });
    });

    it('left-aligns below the anchor', () => {
        expect(placeMenu({ left: 500, right: 600, top: 100, bottom: 130 }, MENU, VIEWPORT, 'left')).toEqual({ x: 500, y: 136 });
    });

    it('keeps the menu inside the viewport horizontally', () => {
        expect(placeMenu({ left: 900, right: 990, top: 100, bottom: 130 }, MENU, VIEWPORT, 'left').x).toBe(792);
        expect(placeMenu({ left: 10, right: 60, top: 100, bottom: 130 }, MENU, VIEWPORT, 'right').x).toBe(8);
    });

    it('opens above the anchor when there is no room below', () => {
        expect(placeMenu({ left: 500, right: 600, top: 700, bottom: 730 }, MENU, VIEWPORT, 'right').y).toBe(574);
    });
});

describe('anchorRectOf', () => {
    it('opens a context menu at the pointer', () => {
        const rect = anchorRectOf({ x: 300, y: 200 });

        expect(placeMenu(rect, MENU, VIEWPORT, 'left')).toEqual({ x: 300, y: 200 });
    });
});
