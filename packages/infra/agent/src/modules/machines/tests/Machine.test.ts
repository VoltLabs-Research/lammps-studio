import agentPackage from '../../../../package.json';
import { machineRoutes } from '@lammps-studio/contracts/machine/routes';
import { startAgent } from '@tests/harness';
import { expectError, request } from '@tests/request';
import { availableParallelism, hostname } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DISK_SIZE = /^\d+(\.\d)? (B|KB|MB|GB|TB|PB)$/;

const app = await startAgent();

describe('MachineController', () => {
    it('lists this computer, described from the system it runs on', async () => {
        const res = await request(app, machineRoutes.list);

        expect(res.status).toBe(200);
        const machines = res.data();
        expect(machines).toHaveLength(1);
        expect(machines[0]).toMatchObject({
            id: 'local',
            name: 'This computer',
            kind: 'local',
            status: 'online',
            host: hostname(),
            cores: availableParallelism(),
            scheduler: null,
            agentVersion: agentPackage.version,
            root: join(process.env.LAMMPS_STUDIO_ROOT ?? '', 'simulations'),
            offlineSince: null
        });
        expect(machines[0].diskFree).toMatch(DISK_SIZE);
        expect(machines[0].memory).toMatch(DISK_SIZE);
        expect(machines[0].runtime).toMatch(/^Docker /);
        expect(Number.isInteger(machines[0].gpus)).toBe(true);
    });

    it('gets this computer by its id', async () => {
        const res = await request(app, machineRoutes.get, { params: { machineId: 'local' } });

        expect(res.status).toBe(200);
        expect(res.data()).toMatchObject({ id: 'local', name: 'This computer' });
    });

    it('answers 404 for a machine it does not know', async () => {
        const res = await request(app, machineRoutes.get, { params: { machineId: 'atlas' } });

        expectError(res, 404, 'Machine::NotFound');
    });
});
