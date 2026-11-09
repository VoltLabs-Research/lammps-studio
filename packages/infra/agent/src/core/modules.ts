import { ModuleEntry } from '@lammps-studio/readable/services/ModuleDiscovery';

export const modules: ModuleEntry[] = [
    {
        module: 'builds',
        category: 'controllers',
        load: () => import('../modules/builds/controllers/Build')
    },
    {
        module: 'editor',
        category: 'controllers',
        load: () => import('../modules/editor/controllers/Editor')
    },
    {
        module: 'events',
        category: 'gateways',
        load: () => import('../modules/events/gateways/Events')
    },
    {
        module: 'files',
        category: 'controllers',
        load: () => import('../modules/files/controllers/File')
    },
    {
        module: 'machines',
        category: 'controllers',
        load: () => import('../modules/machines/controllers/Machine')
    },
    {
        module: 'simulations',
        category: 'controllers',
        load: () => import('../modules/simulations/controllers/Simulation')
    }
];
