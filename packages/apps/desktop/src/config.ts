import { app } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEV_STUDIO_URL = 'http://localhost:5180';

const packaged = () => {
    return {
        studioUrl: pathToFileURL(join(process.resourcesPath, 'studio', 'index.html')).href
    };
};

const local = () => {
    return {
        studioUrl: DEV_STUDIO_URL
    };
};

export const config = app.isPackaged ? packaged() : local();
