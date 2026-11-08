import { app, BrowserWindow, nativeTheme, session } from 'electron';
import { config } from './config';
import { guardNavigation, isOwnFrame } from './navigation';
import { readPlacement, rememberPlacement } from './placement';

const DEFAULT_SIZE = {
    width: 1280,
    height: 840
};
const MIN_WIDTH = 960;
const MIN_HEIGHT = 640;
const LIGHT_CANVAS = '#f5f5f5';
const DARK_CANVAS = '#090909';

const canvasColor = (): string => {
    if(nativeTheme.shouldUseDarkColors) return DARK_CANVAS;

    return LIGHT_CANVAS;
};

const createWindow = (): BrowserWindow => {
    const placement = readPlacement();
    const window = new BrowserWindow({
        ...placement?.bounds ?? DEFAULT_SIZE,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: canvasColor(),
        webPreferences: {
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false
        }
    });
    if(process.platform === 'darwin') window.setWindowButtonVisibility(false);
    if(placement?.maximized) window.maximize();
    nativeTheme.on('updated', () => window.setBackgroundColor(canvasColor()));
    rememberPlacement(window);
    guardNavigation(window);
    void window.loadURL(config.studioUrl);
    return window;
};

const hideOnClose = (window: BrowserWindow) => {
    let quitting = false;
    app.on('before-quit', () => {
        quitting = true;
    });
    window.on('close', (event) => {
        if(quitting) return;
        event.preventDefault();
        window.hide();
    });
    app.on('activate', () => window.show());
};

const start = async () => {
    await app.whenReady();
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, grant, details) => {
        grant(isOwnFrame(details.requestingUrl));
    });

    const window = createWindow();
    if(process.platform === 'darwin') hideOnClose(window);
    app.on('second-instance', () => {
        window.show();
        window.focus();
    });
};

if(app.requestSingleInstanceLock()){
    void start();
}else{
    app.quit();
}
