import { app, BrowserWindow, Rectangle, screen } from 'electron';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WindowPlacement{
    bounds: Rectangle;
    maximized: boolean;
}

const PLACEMENT_FILE = 'window.json';
const RECTANGLE_KEYS = ['x', 'y', 'width', 'height'];

const placementPath = (): string => {
    return join(app.getPath('userData'), PLACEMENT_FILE);
};

const isRectangle = (value: unknown): value is Rectangle => {
    if(typeof value !== 'object' || value === null) return false;

    const fields = new Map(Object.entries(value));
    return RECTANGLE_KEYS.every((key) => Number.isFinite(fields.get(key)));
};

const isPlacement = (value: unknown): value is WindowPlacement => {
    if(typeof value !== 'object' || value === null) return false;

    const fields = new Map(Object.entries(value));
    return isRectangle(fields.get('bounds')) && typeof fields.get('maximized') === 'boolean';
};

const overlaps = (a: Rectangle, b: Rectangle): boolean => {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
};

const isOnScreen = (bounds: Rectangle): boolean => {
    return screen.getAllDisplays().some((display) => overlaps(display.workArea, bounds));
};

export const readPlacement = (): WindowPlacement | undefined => {
    const path = placementPath();
    if(!existsSync(path)) return;

    const placement: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if(!isPlacement(placement) || !isOnScreen(placement.bounds)) return;

    return placement;
};

export const rememberPlacement = (window: BrowserWindow) => {
    window.on('close', () => {
        const placement: WindowPlacement = {
            bounds: window.getNormalBounds(),
            maximized: window.isMaximized()
        };
        const path = placementPath();
        writeFileSync(`${path}.tmp`, JSON.stringify(placement));
        renameSync(`${path}.tmp`, path);
    });
};
