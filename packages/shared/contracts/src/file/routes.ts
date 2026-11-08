import { del, get } from '../shared/routing';
import { FileEntry } from './domain';

export const fileRoutes = {
    list: get<FileEntry[]>('/files/:simulationId'),
    download: get<ArrayBuffer>('/files/:simulationId/download'),
    remove: del('/files/:simulationId')
};
