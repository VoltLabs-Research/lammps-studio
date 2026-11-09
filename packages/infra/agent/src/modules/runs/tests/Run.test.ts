import { buildRoutes } from '@lammps-studio/contracts/build/routes';
import { LogLine } from '@lammps-studio/contracts/run/domain';
import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { decodeFrame } from '@lammps-studio/lammps/dump/frame-codec';
import { META_PREFIX } from '@lammps-studio/lammps/log/domain';
import { listenToEvents } from '@tests/events';
import { FakeDocker, KILL_EXIT, SIGTERM_EXIT } from '@tests/fakeDocker';
import { writeTree } from '@tests/files';
import { startAgent } from '@tests/harness';
import { expectError, request } from '@tests/request';
import {
    eventsOf,
    fetchRun,
    identityOf,
    MELT_END,
    MELT_SETUP,
    meltRow,
    meltSimulation,
    runDirOf,
    runningContainer,
    runRecord,
    startRun,
    statesOf
} from '@tests/runs';
import { folderOf } from '@tests/simulations';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPLETED = /^studio › run 1 completed · exit code 0 · \d+ s$/;

const docker = new FakeDocker();
const app = await startAgent(docker.runtime);
const manybody = identityOf('MANYBODY');
docker.addImage(manybody.tag);

const textsOf = (lines: LogLine[]): string[] => lines.map((line) => line.text);

const decoded = (raw: Buffer) => decodeFrame(new Uint8Array(raw).buffer);

describe('a run', () => {
    it('starts on a build that is there, streams its output and frames, and completes', async () => {
        const simulation = await meltSimulation(app, 'Melt');
        const events = await listenToEvents(app);

        const run = await startRun(app, simulation);

        expect(run).toMatchObject({
            simulationId: simulation.id,
            number: 1,
            state: 'starting',
            buildHash: manybody.hash,
            outputDir: 'runs/run-1',
            progress: { step: 0, totalSteps: 100, section: 1, sections: 1, stepsPerSecond: null },
            error: null
        });
        const container = await runningContainer(docker, simulation, 1);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'running' });

        container.print(...MELT_SETUP, meltRow(0), meltRow(50), meltRow(100), ...MELT_END);
        docker.dump(runDirOf(simulation, 1), 0, 3);
        docker.dump(runDirOf(simulation, 1), 100, 3);
        container.exit(0);

        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed' });
        const ended = await fetchRun(app, simulation, 1);
        expect(ended).toMatchObject({
            progress: { step: 100, totalSteps: 100, section: 1, sections: 1, stepsPerSecond: null },
            frames: 2,
            warnings: 0,
            error: null
        });
        expect(statesOf(events.received, simulation)).toEqual(['starting', 'running', 'completed']);

        const log = (await request(app, runRoutes.log, { params: { simulationId: simulation.id, runNumber: 1 } })).data();
        expect(log.map((line) => line.index)).toEqual(log.map((_, index) => index));
        expect(textsOf(log).slice(0, -1)).toEqual([
            `studio › run 1 on This computer · build ${manybody.hash}`,
            'studio › container fake1 started · 2 MPI',
            'studio › mpirun -np 2 lmp -in main.in',
            ...MELT_SETUP,
            meltRow(0),
            meltRow(50),
            meltRow(100),
            ...MELT_END
        ]);
        expect(log.at(-1)?.text).toMatch(COMPLETED);
        expect(eventsOf(events.received, 'run:log').flatMap(({ lines }) => lines)).toEqual(log);
        expect(eventsOf(events.received, 'run:thermo').flatMap(({ rows }) => rows)).toEqual([[0, 1.5, -4.7], [50, 1.5, -4.7], [100, 1.5, -4.7]]);
        expect(eventsOf(events.received, 'run:frame').map(({ frame }) => frame)).toEqual([{ index: 0, step: 0, atoms: 3 }, { index: 1, step: 100, atoms: 3 }]);

        await expect.poll(() => readFile(join(runDirOf(simulation, 1), 'screen.log'), 'utf8')).toBe(`${textsOf(log).join('\n')}\n`);
        await expect.poll(async () => JSON.parse(await readFile(join(runDirOf(simulation, 1), 'run.json'), 'utf8'))).toEqual(ended);
        events.socket.terminate();
    });

    it('serves a frame as bytes and the run as the last run of its simulation', async () => {
        const simulation = await meltSimulation(app, 'Framed');
        await startRun(app, simulation);
        const container = await runningContainer(docker, simulation, 1);
        container.print(...MELT_SETUP, meltRow(0), meltRow(100));
        docker.dump(runDirOf(simulation, 1), 100, 3);
        container.exit(0);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed' });

        const params = { simulationId: simulation.id, runNumber: 1 };
        const frame = await request(app, runRoutes.frame, { params: { ...params, frameIndex: 0 } });
        expect(frame.contentType).toBe('application/octet-stream');
        expect(decoded(frame.raw).header).toMatchObject({ step: 100, atoms: 3 });
        expectError(await request(app, runRoutes.frame, { params: { ...params, frameIndex: 1 } }), 404, 'Run::FrameNotFound');

        await expect.poll(async () => (await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } })).data()).toMatchObject({
            lastRun: { number: 1, state: 'completed', progress: { step: 100 } }
        });
    });

    it('serves a run it is not following from the run folder', async () => {
        const simulation = await meltSimulation(app, 'From disk');
        const runDir = runDirOf(simulation, 5);
        await writeTree(folderOf(simulation), {
            'runs/run-5/run.json': JSON.stringify(runRecord(simulation.id, 5, manybody.hash)),
            'runs/run-5/screen.log': [`${META_PREFIX}run 5 on This computer`, ...MELT_SETUP, meltRow(0), meltRow(100), 'WARNING: Too many neighbors (src/compute_cna_atom.cpp:180)', ''].join('\n')
        });
        docker.dump(runDir, 0, 3);
        docker.dump(runDir, 100, 3);
        const params = { simulationId: simulation.id, runNumber: 5 };

        const log = (await request(app, runRoutes.log, { params })).data();

        expect(log.map(({ index, kind }) => [index, kind])).toEqual([[0, 'meta'], [1, 'head'], [2, 'text'], [3, 'head'], [4, 'thermo'], [5, 'thermo'], [6, 'warning']]);
        expect((await request(app, runRoutes.thermo, { params })).data()).toEqual([{ section: 0, columns: ['Step', 'Temp', 'PotEng'], rows: [[0, 1.5, -4.7], [100, 1.5, -4.7]] }]);
        expect((await request(app, runRoutes.frames, { params })).data()).toEqual([{ index: 0, step: 0, atoms: 3 }, { index: 1, step: 100, atoms: 3 }]);
        expect(decoded((await request(app, runRoutes.frame, { params: { ...params, frameIndex: 1 } })).raw).header.step).toBe(100);
        expect((await request(app, runRoutes.get, { params })).data()).toMatchObject({ number: 5, state: 'completed' });
    });

    it('builds LAMMPS first when the image is missing, listing the build the run waits for', async () => {
        const simulation = await meltSimulation(app, 'Needs a build');
        const kspace = identityOf('KSPACE');

        const run = await startRun(app, simulation, { packages: ['KSPACE'] });

        expect(run).toMatchObject({ state: 'building', buildHash: kspace.hash });
        await expect.poll(async () => (await request(app, buildRoutes.get, { params: { hash: kspace.hash } })).data()).toMatchObject({ status: 'building', usedBy: 1 });
        const log = (await request(app, runRoutes.log, { params: { simulationId: simulation.id, runNumber: 1 } })).data();
        expect(textsOf(log)).toContain(`studio › building LAMMPS ${run.config.version} with KSPACE`);

        await expect.poll(() => docker.isBuilding(kspace.tag)).toBe(true);
        docker.finishBuild(kspace.tag);
        const container = await runningContainer(docker, simulation, 1);
        expect(container.request.image).toBe(kspace.tag);
        container.exit(0);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed' });
    });

    it('fails a run whose build fails, with the build output as its error', async () => {
        const simulation = await meltSimulation(app, 'Broken build');
        const rigid = identityOf('RIGID');
        await startRun(app, simulation, { packages: ['RIGID'] });
        await expect.poll(() => docker.isBuilding(rigid.tag)).toBe(true);

        docker.failBuild(rigid.tag, 'The command cmake returned a non-zero code: 2');

        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({
            state: 'failed',
            error: { message: 'The LAMMPS build failed: The command cmake returned a non-zero code: 2', step: null, line: null }
        });
    });

    it('fails a run on the error LAMMPS printed, near the step it reached', async () => {
        const simulation = await meltSimulation(app, 'Lost atoms');
        await startRun(app, simulation);
        const container = await runningContainer(docker, simulation, 1);

        container.print(...MELT_SETUP, meltRow(0), meltRow(50), 'ERROR: Lost atoms: original 3 current 2 (src/thermo.cpp:488)', 'Last command: run 100');
        container.exit(1);

        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'failed' });
        const log = (await request(app, runRoutes.log, { params: { simulationId: simulation.id, runNumber: 1 } })).data();
        const errorLine = log.find((line) => line.kind === 'error');
        expect((await fetchRun(app, simulation, 1)).error).toEqual({ message: 'Lost atoms: original 3 current 2', step: 50, line: errorLine?.index });
        expect(textsOf(log).at(-1)).toBe('studio › LAMMPS exited with code 1 near step 50 · container removed');
    });

    it('cancels a run the user stopped, though mpirun exits 1 on SIGTERM', async () => {
        const simulation = await meltSimulation(app, 'Stopped');
        await startRun(app, simulation);
        const container = await runningContainer(docker, simulation, 1);
        container.print(...MELT_SETUP, meltRow(0), meltRow(50));

        const stopped = await request(app, runRoutes.stop, { params: { simulationId: simulation.id, runNumber: 1 }, body: { kill: false } });

        expect(stopped.status).toBe(200);
        expect(['stopping', 'cancelled']).toContain(stopped.data().state);
        expect(container.exitCode).toBe(SIGTERM_EXIT);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'cancelled', error: null });
        const log = (await request(app, runRoutes.log, { params: { simulationId: simulation.id, runNumber: 1 } })).data();
        expect(textsOf(log).slice(-3)).toEqual([
            'studio › stop requested · docker stop, 10 s grace',
            'studio › LAMMPS received SIGTERM near step 50',
            'studio › run 1 stopped'
        ]);
    });

    it('kills a run when asked to, and still takes it as cancelled', async () => {
        const simulation = await meltSimulation(app, 'Killed');
        await startRun(app, simulation);
        const container = await runningContainer(docker, simulation, 1);
        container.print(...MELT_SETUP, meltRow(0));

        await request(app, runRoutes.stop, { params: { simulationId: simulation.id, runNumber: 1 }, body: { kill: true } });

        expect(container.exitCode).toBe(KILL_EXIT);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'cancelled', error: null });
        const log = (await request(app, runRoutes.log, { params: { simulationId: simulation.id, runNumber: 1 } })).data();
        expect(textsOf(log).slice(-2)).toEqual(['studio › killed near step 0 · docker kill', 'studio › run 1 stopped']);
    });

    it('cancels a run stopped while LAMMPS is still building, and stops the build', async () => {
        const simulation = await meltSimulation(app, 'Stopped while building');
        const molecule = identityOf('MOLECULE');
        await startRun(app, simulation, { packages: ['MOLECULE'] });
        await expect.poll(() => docker.isBuilding(molecule.tag)).toBe(true);

        await request(app, runRoutes.stop, { params: { simulationId: simulation.id, runNumber: 1 }, body: { kill: false } });

        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'cancelled' });
        expect(docker.isBuilding(molecule.tag)).toBe(false);
        expect(docker.container(simulation.id, 1)).toBeUndefined();
        await expect.poll(async () => (await request(app, buildRoutes.get, { params: { hash: molecule.hash } })).data()).toMatchObject({
            status: 'failed',
            output: 'Stopped before it finished'
        });
    });

    it('refuses a second run while one is active, and a stop for a run that ended', async () => {
        const simulation = await meltSimulation(app, 'One at a time');
        const run = await startRun(app, simulation);
        const params = { simulationId: simulation.id };

        expectError(await request(app, runRoutes.start, { params, body: { config: run.config } }), 409, 'Run::AlreadyRunning');
        (await runningContainer(docker, simulation, 1)).exit(0);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed' });

        expectError(await request(app, runRoutes.stop, { params: { ...params, runNumber: 1 }, body: { kill: false } }), 409, 'Run::NotRunning');
        expectError(await request(app, runRoutes.stop, { params: { ...params, runNumber: 7 }, body: { kill: false } }), 404, 'Run::NotFound');
        expectError(await request(app, runRoutes.get, { params: { ...params, runNumber: 'latest' } }), 404, 'Run::NotFound');
        expect((await request(app, runRoutes.list, { params })).data().map(({ number, state }) => [number, state])).toEqual([[1, 'completed']]);
    });

    it('refuses a machine, an entry or a simulation it does not know', async () => {
        const simulation = await meltSimulation(app, 'Refused');
        const { config } = await startRun(app, simulation);
        (await runningContainer(docker, simulation, 1)).exit(0);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed' });
        const start = (patch: object, simulationId = simulation.id) => request(app, runRoutes.start, {
            params: { simulationId },
            body: { config: { ...config, ...patch } }
        });

        expectError(await start({ machineId: 'atlas' }), 404, 'Machine::NotFound');
        expectError(await start({ entry: '../outside.in' }), 400, 'Simulation::EntryOutsideFolder');
        expectError(await start({ entry: 'missing.in' }), 422, 'Simulation::NoEntryScript');
        expectError(await start({}, 'no-such-simulation'), 404, 'Simulation::NotFound');
        expect((await start({ mpiRanks: 'two' })).json()).toMatchObject({ error: 'Request::ValidationFailed', errors: { config: expect.any(String) } });
    });

    it('sends the output that arrives together as one log event, and progress at most once a second', async () => {
        const simulation = await meltSimulation(app, 'Batched');
        await writeTree(folderOf(simulation), { 'main.in': 'thermo 1\nrun 1000\n' });
        await startRun(app, simulation);
        const container = await runningContainer(docker, simulation, 1);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'running' });
        const events = await listenToEvents(app);

        const rows = Array.from({ length: 40 }, (_, step) => meltRow(step));
        container.print(...MELT_SETUP, ...rows);
        await expect.poll(() => eventsOf(events.received, 'run:log').flatMap(({ lines }) => lines)).toHaveLength(MELT_SETUP.length + rows.length);
        expect(eventsOf(events.received, 'run:log')).toHaveLength(1);
        expect(eventsOf(events.received, 'run:thermo')).toHaveLength(1);

        const started = Date.now();
        for(let burst = 1; burst <= 8; burst++){
            container.print(meltRow(39 + burst));
            await new Promise((resolve) => setTimeout(resolve, 150));
        }
        const updates = eventsOf(events.received, 'run:updated').filter(({ run }) => run.simulationId === simulation.id);
        expect(updates.length).toBeLessThanOrEqual(Math.ceil((Date.now() - started) / 1000) + 1);
        expect(updates.at(-1)?.run.progress).toMatchObject({ section: 1, sections: 1, totalSteps: 1000 });

        container.exit(0);
        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed', progress: { step: 47 } });
        events.socket.terminate();
    });
});
