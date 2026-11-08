import { get } from '../shared/routing';
import { Machine } from './domain';

export const machineRoutes = {
    list: get<Machine[]>('/machines'),
    get: get<Machine>('/machines/:machineId')
};
