import { config } from '@/config';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { listenToEvents } from '@tests/events';
import { writeTree } from '@tests/files';
import { startAgent } from '@tests/harness';
import { authorized, expectError, request } from '@tests/request';
import { createSimulation, folderOf } from '@tests/simulations';
import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const app = await startAgent();

const asset = (path: string): Promise<string> => readFile(join(config.assetsDir, path), 'utf8');

describe('SimulationController', () => {
    it('creates an empty simulation as a folder with a runnable LJ melt', async () => {
        const simulation = await createSimulation(app, { name: 'LJ starter', template: 'empty' });

        expect(simulation).toMatchObject({
            name: 'LJ starter',
            machineId: 'local',
            folder: 'lj-starter',
            entry: 'main.in',
            lastRun: null,
            hasPreview: false
        });
        expect(simulation.createdAt).toMatch(ISO_DATE);
        expect(await readFile(join(folderOf(simulation), 'main.in'), 'utf8')).toBe(await asset('empty/main.in'));
        const record = JSON.parse(await readFile(join(folderOf(simulation), '.studio', 'simulation.json'), 'utf8'));
        expect(record).toEqual({
            id: simulation.id,
            name: 'LJ starter',
            entry: null,
            createdAt: simulation.createdAt,
            updatedAt: simulation.updatedAt
        });
    });

    it('creates a simulation from each bundled example', async () => {
        for(const example of ['melt', 'crack', 'indent']){
            const simulation = await createSimulation(app, { name: `Example ${example}`, template: 'example', source: example });

            expect(simulation.entry).toBe('main.in');
            expect(await readFile(join(folderOf(simulation), 'main.in'), 'utf8')).toBe(await asset(`examples/${example}/main.in`));
        }
    });

    it('refuses an example it does not bundle', async () => {
        const res = await request(app, simulationRoutes.create, {
            body: { name: 'Nope', machineId: 'local', template: 'example', source: 'water' }
        });

        expect(res.status).toBe(400);
        expect(res.json()).toEqual({ error: 'Request::ValidationFailed', errors: { source: 'Unknown example' } });
        expect(await readdir(config.simulationsDir)).not.toContain('nope');
    });

    it('validates the body against the contract', async () => {
        const res = await app.inject({
            method: simulationRoutes.create.method,
            url: simulationRoutes.create.path,
            headers: authorized,
            payload: { name: 'Bad', machineId: 'local', template: 'blank', source: null }
        });

        expect(res.statusCode).toBe(400);
        expect(res.json()).toMatchObject({ error: 'Request::ValidationFailed', errors: { template: expect.any(String) } });

        const simulation = await createSimulation(app, { name: 'Valid' });
        const rename = await app.inject({
            method: simulationRoutes.update.method,
            url: simulationRoutes.update.path.replace(':simulationId', simulation.id),
            headers: authorized,
            payload: { name: 7 }
        });
        expect(rename.statusCode).toBe(400);
        expect(rename.json()).toMatchObject({ error: 'Request::ValidationFailed', errors: { name: expect.any(String) } });
    });

    it('refuses a simulation on a machine it does not know', async () => {
        const res = await request(app, simulationRoutes.create, {
            body: { name: 'Remote', machineId: 'atlas', template: 'empty', source: null }
        });

        expectError(res, 404, 'Machine::NotFound');
    });

    it('refuses a name another simulation already has', async () => {
        await createSimulation(app, { name: 'Twin' });

        const res = await request(app, simulationRoutes.create, {
            body: { name: ' twin ', machineId: 'local', template: 'empty', source: null }
        });

        expectError(res, 409, 'Simulation::NameTaken');
    });

    it('makes the folder name unique when two names share a kebab case', async () => {
        const first = await createSimulation(app, { name: 'Cu nanowire tension' });
        const second = await createSimulation(app, { name: 'Cu nanowire, tension!' });

        expect(first.folder).toBe('cu-nanowire-tension');
        expect(second.folder).toBe('cu-nanowire-tension-2');
    });

    it('lists the simulations on disk and gets one by id', async () => {
        const simulation = await createSimulation(app, { name: 'Listed' });

        const list = await request(app, simulationRoutes.list);
        const one = await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } });

        expect(list.data()).toContainEqual(simulation);
        expect(one.data()).toEqual(simulation);
    });

    it('answers 404 for a simulation that does not exist', async () => {
        const res = await request(app, simulationRoutes.get, { params: { simulationId: 'missing' } });

        expectError(res, 404, 'Simulation::NotFound');
    });

    it('renames a simulation and keeps its folder', async () => {
        const simulation = await createSimulation(app, { name: 'Draft' });

        const res = await request(app, simulationRoutes.update, {
            params: { simulationId: simulation.id },
            body: { name: 'Final' }
        });

        expect(res.status).toBe(200);
        expect(res.data()).toMatchObject({ id: simulation.id, name: 'Final', folder: 'draft' });
        expect(res.data().updatedAt >= simulation.updatedAt).toBe(true);
        const listed = (await request(app, simulationRoutes.list)).data();
        expect(listed.find((other) => other.id === simulation.id)?.name).toBe('Final');
    });

    it('refuses to rename a simulation to a name another one has', async () => {
        await createSimulation(app, { name: 'Taken name' });
        const simulation = await createSimulation(app, { name: 'Free name' });

        const res = await request(app, simulationRoutes.update, {
            params: { simulationId: simulation.id },
            body: { name: 'Taken Name' }
        });

        expectError(res, 409, 'Simulation::NameTaken');
    });

    it('sets the entry script to a file inside the folder', async () => {
        const simulation = await createSimulation(app, { name: 'Entry' });
        await writeTree(folderOf(simulation), { 'inputs/run.lmp': 'run 10\n' });

        const res = await request(app, simulationRoutes.update, {
            params: { simulationId: simulation.id },
            body: { entry: 'inputs/run.lmp' }
        });

        expect(res.data().entry).toBe('inputs/run.lmp');
        const fetched = await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } });
        expect(fetched.data().entry).toBe('inputs/run.lmp');
    });

    it('refuses an entry script outside the folder or missing from it', async () => {
        const simulation = await createSimulation(app, { name: 'Bad entry' });
        const update = (entry: string) => request(app, simulationRoutes.update, {
            params: { simulationId: simulation.id },
            body: { entry }
        });

        expectError(await update('../listed/main.in'), 400, 'Simulation::EntryOutsideFolder');
        expectError(await update('/etc/hostname'), 400, 'Simulation::EntryOutsideFolder');
        expectError(await update('absent.in'), 422, 'Simulation::NoEntryScript');
    });

    it('duplicates everything but the runs and the preview', async () => {
        const simulation = await createSimulation(app, { name: 'Original' });
        await writeTree(folderOf(simulation), {
            'potentials/Cu01.eam.alloy': 'eam',
            'runs/run-1/log.lammps': 'log',
            '.studio/preview.bin': Buffer.from([1, 2, 3])
        });

        const res = await request(app, simulationRoutes.duplicate, { params: { simulationId: simulation.id } });

        expect(res.status).toBe(201);
        const copy = res.data();
        expect(copy).toMatchObject({ name: 'Original copy', folder: 'original-copy', entry: 'main.in', hasPreview: false });
        expect(copy.id).not.toBe(simulation.id);
        expect(await readFile(join(folderOf(copy), 'potentials', 'Cu01.eam.alloy'), 'utf8')).toBe('eam');
        await expect(access(join(folderOf(copy), 'runs'))).rejects.toThrow();
        await expect(access(join(folderOf(copy), '.studio', 'preview.bin'))).rejects.toThrow();
        const second = await request(app, simulationRoutes.duplicate, { params: { simulationId: simulation.id } });
        expect(second.data().name).toBe('Original copy 2');
    });

    it('removes a simulation with its folder', async () => {
        const simulation = await createSimulation(app, { name: 'Doomed' });

        const res = await request(app, simulationRoutes.remove, { params: { simulationId: simulation.id } });

        expect(res.status).toBe(204);
        await expect(access(folderOf(simulation))).rejects.toThrow();
        expectError(await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } }), 404, 'Simulation::NotFound');
    });

    it('tells every client when a simulation is created, changed and removed', async () => {
        const listener = await listenToEvents(app);

        const simulation = await createSimulation(app, { name: 'Watched' });
        const renamed = await request(app, simulationRoutes.update, {
            params: { simulationId: simulation.id },
            body: { name: 'Watched closely' }
        });
        await request(app, simulationRoutes.remove, { params: { simulationId: simulation.id } });

        await expect.poll(() => listener.received).toEqual([
            { type: 'simulation:updated', simulation },
            { type: 'simulation:updated', simulation: renamed.data() },
            { type: 'simulation:removed', simulationId: simulation.id }
        ]);
        listener.socket.terminate();
    });
});
