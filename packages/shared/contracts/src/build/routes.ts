import { del, get, post } from '../shared/routing';
import { Build } from './domain';
import { CreateBuildInput } from './http';

export const buildRoutes = {
    list: get<Build[]>('/builds'),
    create: post<CreateBuildInput, Build>('/builds'),
    get: get<Build>('/builds/:hash'),
    remove: del('/builds/:hash')
};
