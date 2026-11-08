import BaseController from '../lib/controllers/BaseController';
import BaseGateway from '../lib/gateway/BaseGateway';
import ModuleDiscovery, { ModuleEntry } from '../lib/services/ModuleDiscovery';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const MODULE_FILES = [
    'runs/controllers/Run.ts',
    'runs/gateways/RunLog.ts',
    'runs/services/Run.ts',
    'machines/controllers/Machine.ts',
    'machines/controllers/types.d.ts',
    'machines/controllers/notes.md',
    'events/gateways/Events.ts'
];

class RunController extends BaseController{}

class EventsGateway extends BaseGateway{}

const modulesDir = await mkdtemp(join(tmpdir(), 'readable-modules-'));
for(const file of MODULE_FILES){
    await mkdir(dirname(join(modulesDir, file)), { recursive: true });
    await writeFile(join(modulesDir, file), '');
}

describe('ModuleDiscovery', () => {
    afterAll(() => rm(modulesDir, { recursive: true, force: true }));

    it('finds the controllers and gateways of every module folder, sorted', async () => {
        expect(await new ModuleDiscovery(modulesDir).files()).toEqual([
            { module: 'events', category: 'gateways', name: 'Events' },
            { module: 'machines', category: 'controllers', name: 'Machine' },
            { module: 'runs', category: 'controllers', name: 'Run' },
            { module: 'runs', category: 'gateways', name: 'RunLog' }
        ]);
    });

    it('renders a manifest of lazy imports a bundler can follow', async () => {
        const manifest = await new ModuleDiscovery(modulesDir).manifest('../modules');

        expect(manifest).toBe([
            "import { ModuleEntry } from '@lammps-studio/readable/services/ModuleDiscovery';",
            '',
            'export const modules: ModuleEntry[] = [',
            '    {',
            "        module: 'events',",
            "        category: 'gateways',",
            "        load: () => import('../modules/events/gateways/Events')",
            '    },',
            '    {',
            "        module: 'machines',",
            "        category: 'controllers',",
            "        load: () => import('../modules/machines/controllers/Machine')",
            '    },',
            '    {',
            "        module: 'runs',",
            "        category: 'controllers',",
            "        load: () => import('../modules/runs/controllers/Run')",
            '    },',
            '    {',
            "        module: 'runs',",
            "        category: 'gateways',",
            "        load: () => import('../modules/runs/gateways/RunLog')",
            '    }',
            '];',
            ''
        ].join('\n'));
    });

    it('mounts each controller under its module folder name', async () => {
        const entries: ModuleEntry[] = [
            { module: 'runs', category: 'controllers', load: async () => ({ default: RunController }) },
            { module: 'events', category: 'gateways', load: async () => ({ default: EventsGateway }) },
            { module: 'empty', category: 'gateways', load: async () => ({}) }
        ];

        expect(await ModuleDiscovery.load(entries)).toEqual({
            controllers: [{ prefix: '/runs', Controller: RunController }],
            gateways: [EventsGateway]
        });
    });
});
