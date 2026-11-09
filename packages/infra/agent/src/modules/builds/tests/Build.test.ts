import { config } from '@/config';
import { BuildRecord } from '@/modules/builds/contracts/domain/build';
import { Build } from '@lammps-studio/contracts/build/domain';
import { buildRoutes } from '@lammps-studio/contracts/build/routes';
import { StudioEvent } from '@lammps-studio/contracts/events/gateway';
import { BuildIdentity } from '@lammps-studio/runtime/domain/build/BuildSpec';
import { listenToEvents } from '@tests/events';
import { FakeDocker, IMAGE_BYTES } from '@tests/fakeDocker';
import { writeTree } from '@tests/files';
import { bootAgent, startAgent } from '@tests/harness';
import { expectError, request } from '@tests/request';
import { eventsOf, identityOf, LAMMPS_VERSION, runRecord } from '@tests/runs';
import { createSimulation, folderOf } from '@tests/simulations';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const docker = new FakeDocker();
const app = await startAgent(docker.runtime);

const createBuild = (...packages: string[]) => request(app, buildRoutes.create, {
    body: { machineId: 'local', version: LAMMPS_VERSION, packages }
});

const getBuild = async (hash: string): Promise<Build> => (await request(app, buildRoutes.get, { params: { hash } })).data();

const updatesOf = (received: StudioEvent[], hash: string): Build[] => eventsOf(received, 'build:updated')
    .map((event) => event.build)
    .filter((build) => build.hash === hash);

const savedBuilds = async (): Promise<BuildRecord[]> => JSON.parse(await readFile(config.buildsFile, 'utf8')) as BuildRecord[];

const interruptedRecord = (identity: BuildIdentity): BuildRecord => ({
    hash: identity.hash,
    machineId: 'local',
    version: identity.version,
    packages: identity.packages,
    image: identity.tag,
    sizeBytes: null,
    status: 'building',
    progress: 0.4,
    steps: [],
    output: null,
    buildSeconds: null,
    createdAt: '2026-11-08T10:00:00.000Z'
});

describe('BuildController', () => {
    it('builds an image a build asks for, reporting its progress until it is ready', async () => {
        const { hash, tag } = identityOf('MC');
        const events = await listenToEvents(app);

        const res = await createBuild('mc');

        expect(res.status).toBe(201);
        expect(res.data()).toMatchObject({ hash, machineId: 'local', version: LAMMPS_VERSION, packages: ['MC'], image: tag, status: 'building', usedBy: 0 });
        await expect.poll(() => docker.isBuilding(tag)).toBe(true);
        docker.progressBuild(tag, { progress: 0.5, steps: [{ name: 'Compile', state: 'active', detail: '10 files' }], output: '[ 50%] Building CXX object' });
        docker.finishBuild(tag);

        await expect.poll(() => getBuild(hash)).toMatchObject({ status: 'ready', progress: 1, sizeBytes: IMAGE_BYTES });
        expect((await getBuild(hash)).buildSeconds).toBeGreaterThanOrEqual(0);
        expect(updatesOf(events.received, hash).map((build) => [build.status, build.progress])).toEqual([['building', 0], ['building', 0.5], ['ready', 1]]);
        await expect.poll(savedBuilds).toContainEqual(expect.objectContaining({ hash, status: 'ready' }));
        events.socket.terminate();
    });

    it('takes an image that is already there as a ready build without building it', async () => {
        const { hash, tag } = identityOf('RIGID');
        docker.addImage(tag);

        const res = await createBuild('RIGID');

        expect(res.data()).toMatchObject({ hash, status: 'ready', sizeBytes: IMAGE_BYTES, buildSeconds: null });
        expect(docker.isBuilding(tag)).toBe(false);
    });

    it('reports a build that fails with the output that explains it', async () => {
        const { hash, tag } = identityOf('KSPACE');

        await createBuild('KSPACE');
        await expect.poll(() => docker.isBuilding(tag)).toBe(true);
        docker.failBuild(tag, 'The command cmake returned a non-zero code: 2');

        await expect.poll(() => getBuild(hash)).toMatchObject({ status: 'failed', output: 'The command cmake returned a non-zero code: 2' });
    });

    it('counts the runs that used a build and keeps it while they exist', async () => {
        const { hash, tag } = identityOf('MOLECULE');
        docker.addImage(tag);
        await createBuild('MOLECULE');
        const simulation = await createSimulation(app, { name: 'Used build' });
        await writeTree(folderOf(simulation), {
            'runs/run-1/run.json': JSON.stringify(runRecord(simulation.id, 1, hash)),
            'runs/run-2/run.json': JSON.stringify(runRecord(simulation.id, 2, hash))
        });

        expect((await getBuild(hash)).usedBy).toBe(2);
        expect((await request(app, buildRoutes.list)).data()).toContainEqual(expect.objectContaining({ hash, usedBy: 2 }));
        expectError(await request(app, buildRoutes.remove, { params: { hash } }), 409, 'Build::InUse');

        await rm(folderOf(simulation), { recursive: true });
        expect((await request(app, buildRoutes.remove, { params: { hash } })).status).toBe(204);
        expect(docker.removedImages).toContain(tag);
        expectError(await request(app, buildRoutes.get, { params: { hash } }), 404, 'Build::NotFound');
    });

    it('refuses to remove a build that is still building', async () => {
        const { hash, tag } = identityOf('REPLICA');
        await createBuild('REPLICA');
        await expect.poll(() => docker.isBuilding(tag)).toBe(true);

        expectError(await request(app, buildRoutes.remove, { params: { hash } }), 409, 'Build::InUse');
        docker.finishBuild(tag);
        await expect.poll(savedBuilds).toContainEqual(expect.objectContaining({ hash, status: 'ready' }));
    });

    it('answers 404 for a build it does not know and refuses a machine it does not know', async () => {
        expectError(await request(app, buildRoutes.get, { params: { hash: '000000000000' } }), 404, 'Build::NotFound');
        expectError(await request(app, buildRoutes.create, { body: { machineId: 'atlas', version: LAMMPS_VERSION, packages: [] } }), 404, 'Machine::NotFound');
    });

    it('settles the builds the agent was running when it stopped', async () => {
        const finished = identityOf('VORONOI');
        const lost = identityOf('MC', 'VORONOI');
        docker.addImage(finished.tag);
        await writeFile(config.buildsFile, JSON.stringify([...await savedBuilds(), interruptedRecord(finished), interruptedRecord(lost)]));

        const restarted = await bootAgent(docker.runtime);

        expect(await getBuild(finished.hash)).toMatchObject({ status: 'ready', sizeBytes: IMAGE_BYTES });
        expect(await getBuild(lost.hash)).toMatchObject({ status: 'failed', output: 'The agent stopped before this build finished' });
        await restarted.application.stop();
    });
});
