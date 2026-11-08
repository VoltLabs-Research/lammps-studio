import { contextBridge, ipcRenderer } from 'electron';
import { StudioBridge } from '@lammps-studio/contracts/desktop/bridge';

const bridge: StudioBridge = {
    agent: ipcRenderer.sendSync('agent:endpoint'),
    platform: process.platform,
    window: {
        close: () => ipcRenderer.send('window:close'),
        minimize: () => ipcRenderer.send('window:minimize'),
        toggleMaximize: () => ipcRenderer.send('window:toggle-maximize')
    }
};

contextBridge.exposeInMainWorld('studio', bridge);
