import { BrowserWindow, shell } from 'electron';
import { config } from './config';

const EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:']);
const LOOPBACK = '127.0.0.1';

const studio = new URL(config.studioUrl);

const isStudio = (url: URL): boolean => {
    if(studio.protocol === 'file:') return url.protocol === 'file:' && url.pathname === studio.pathname;

    return url.origin === studio.origin;
};

const isLoopback = (url: URL): boolean => {
    return url.protocol === 'http:' && url.hostname === LOOPBACK;
};

const openExternally = (url: URL) => {
    if(EXTERNAL_PROTOCOLS.has(url.protocol)) void shell.openExternal(url.toString());
};

export const isOwnFrame = (url: string): boolean => {
    const target = new URL(url);
    return isStudio(target) || isLoopback(target);
};

export const guardNavigation = (window: BrowserWindow) => {
    const contents = window.webContents;

    contents.setWindowOpenHandler(({ url }) => {
        openExternally(new URL(url));
        return { action: 'deny' };
    });

    contents.on('will-frame-navigate', (event) => {
        const target = new URL(event.url);
        if(isStudio(target)) return;
        if(!event.isMainFrame && isLoopback(target)) return;
        event.preventDefault();
        openExternally(target);
    });
};
