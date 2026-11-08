import { BrowserWindow, ipcMain } from 'electron';

export const listenForControls = (window: BrowserWindow) => {
    ipcMain.on('window:minimize', () => window.minimize());
    ipcMain.on('window:toggle-maximize', () => {
        if(window.isMaximized()){
            window.unmaximize();
            return;
        }

        window.maximize();
    });
    ipcMain.on('window:close', () => window.close());
};
