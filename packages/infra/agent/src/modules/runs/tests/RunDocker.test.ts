import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { Run } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { decodeFrame } from '@lammps-studio/lammps/dump/frame-codec';
import { dockerAvailable, removeRunningContainersOf } from '@tests/docker';
import { listenToEvents } from '@tests/events';
import { writeTree } from '@tests/files';
import { AgentApp, bootAgent, StartedAgent } from '@tests/harness';
import { request } from '@tests/request';
import { BANNER, eventsOf, fetchRun, runDirOf, startRun, statesOf } from '@tests/runs';
import { createSimulation, folderOf } from '@tests/simulations';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const BUILD_TIMEOUT_MS = 30 * 60 * 1000;
const RUN_TIMEOUT_MS = 2 * 60 * 1000;
const POLL = { timeout: 60_000, interval: 250 };
const MELT_ATOMS = 4000;
const LONG_RUN = 10_000_000;

const meltScript = (steps: number): string => `units           lj
atom_style      atomic
lattice         fcc 0.8442
region          box block 0 10 0 10 0 10
create_box      1 box
create_atoms    1 box
mass            1 1.0
velocity        all create 3.0 87287 loop geom
pair_style      lj/cut 2.5
pair_coeff      1 1 1.0 1.0 2.5
neighbor        0.3 bin
neigh_modify    every 20 delay 0 check no
fix             1 all nve
compute         pe all pe/atom
dump            traj all custom 100 melt.lammpstrj id type x y z c_pe
dump_modify     traj sort id
thermo          50
run             ${steps}
`;

const agents: StartedAgent[] = [];
const simulations: Simulation[] = [];

const boot = async (): Promise<AgentApp> => {
    const agent = await bootAgent();
    agents.push(agent);

    return agent.app;
};

const meltOf = async (app: AgentApp, name: string, steps: number): Promise<Simulation> => {
    const simulation = await createSimulation(app, { name });
    simulations.push(simulation);
    await writeTree(folderOf(simulation), { 'main.in': meltScript(steps) });

    return simulation;
};

const logOf = async (app: AgentApp, simulation: Simulation) => {
    return (await request(app, runRoutes.log, { params: { simulationId: simulation.id, runNumber: 1 } })).data();
};

const thermoRowsOf = async (app: AgentApp, simulation: Simulation): Promise<number> => {
    return (await logOf(app, simulation)).filter((line) => line.kind === 'thermo').length;
};

const savedRun = async (simulation: Simulation): Promise<Run> => JSON.parse(await readFile(join(runDirOf(simulation, 1), 'run.json'), 'utf8')) as Run;

afterEach(async () => {
    while(agents.length > 0) await agents.pop()?.application.stop();
    simulations.splice(0).forEach((simulation) => removeRunningContainersOf(simulation.id));
});

describe.skipIf(!dockerAvailable())('a LAMMPS run in Docker', () => {
    it('runs a short LJ melt through HTTP and the /events channel', async () => {
        const app = await boot();
        const simulation = await meltOf(app, 'Docker melt', 300);
        const events = await listenToEvents(app);

        await startRun(app, simulation);

        await expect.poll(() => fetchRun(app, simulation, 1), { timeout: BUILD_TIMEOUT_MS, interval: 1000 }).toMatchObject({ state: 'completed' });
        expect(statesOf(events.received, simulation).filter((state) => state !== 'building')).toEqual(['starting', 'running', 'completed']);
        await expect.poll(() => savedRun(simulation)).toMatchObject({
            state: 'completed',
            error: null,
            frames: 4,
            progress: { step: 300, totalSteps: 300, section: 1, sections: 1, stepsPerSecond: null }
        });

        const log = await logOf(app, simulation);
        expect(log.map((line) => line.index)).toEqual(log.map((_, index) => index));
        expect(log.filter((line) => line.text === BANNER)).toHaveLength(1);
        expect(log.some((line) => line.text.startsWith('Loop time of') && line.text.includes('for 300 steps with 4000 atoms'))).toBe(true);
        expect(log.at(-1)?.text).toMatch(/^studio › run 1 completed · exit code 0 · \d+ s$/);
        await expect.poll(() => eventsOf(events.received, 'run:log').flatMap(({ lines }) => lines)).toEqual(log);

        const params = { simulationId: simulation.id, runNumber: 1 };
        const [thermo] = (await request(app, runRoutes.thermo, { params })).data();
        expect(thermo.rows.map((row) => row[0])).toEqual([0, 50, 100, 150, 200, 250, 300]);
        expect((await request(app, runRoutes.frames, { params })).data().map(({ step, atoms }) => [step, atoms])).toEqual([0, 100, 200, 300].map((step) => [step, MELT_ATOMS]));
        expect(eventsOf(events.received, 'run:frame').map(({ frame }) => frame.step)).toEqual([0, 100, 200, 300]);

        const frame = await request(app, runRoutes.frame, { params: { ...params, frameIndex: 2 } });
        expect(frame.contentType).toBe('application/octet-stream');
        expect(decodeFrame(new Uint8Array(frame.raw).buffer).header).toMatchObject({ step: 200, atoms: MELT_ATOMS, columns: ['type', 'c_pe'] });
        await expect.poll(async () => (await request(app, simulationRoutes.get, { params: { simulationId: simulation.id } })).data()).toMatchObject({
            hasPreview: true,
            lastRun: { number: 1, state: 'completed' }
        });
        events.socket.terminate();
    }, BUILD_TIMEOUT_MS);

    it('stops a long run with SIGTERM and records it as cancelled', async () => {
        const app = await boot();
        const simulation = await meltOf(app, 'Docker stop', LONG_RUN);
        await startRun(app, simulation);
        await expect.poll(() => thermoRowsOf(app, simulation), POLL).toBeGreaterThan(1);

        const stopped = await request(app, runRoutes.stop, { params: { simulationId: simulation.id, runNumber: 1 }, body: { kill: false } });

        expect(stopped.status).toBe(200);
        await expect.poll(() => fetchRun(app, simulation, 1), POLL).toMatchObject({ state: 'cancelled', error: null });
        await expect.poll(() => savedRun(simulation)).toMatchObject({ state: 'cancelled', error: null, endedAt: expect.any(String) });
        expect((await logOf(app, simulation)).at(-1)?.text).toBe('studio › run 1 stopped');
    }, RUN_TIMEOUT_MS);

    it('follows a run again after the Application restarts, then kills it', async () => {
        const first = await boot();
        const simulation = await meltOf(first, 'Docker reattach', LONG_RUN);
        await startRun(first, simulation);
        await expect.poll(() => thermoRowsOf(first, simulation), POLL).toBeGreaterThan(1);
        const before = await logOf(first, simulation);
        await agents.pop()?.application.stop();

        const app = await boot();

        expect(await fetchRun(app, simulation, 1)).toMatchObject({ state: 'running' });
        await expect.poll(async () => (await logOf(app, simulation)).length, POLL).toBeGreaterThan(before.length + 2);
        const after = await logOf(app, simulation);
        expect(after.slice(0, before.length)).toEqual(before);
        expect(after.map((line) => line.index)).toEqual(after.map((_, index) => index));
        expect(after.filter((line) => line.text === BANNER)).toHaveLength(1);

        await request(app, runRoutes.stop, { params: { simulationId: simulation.id, runNumber: 1 }, body: { kill: true } });

        await expect.poll(() => fetchRun(app, simulation, 1), POLL).toMatchObject({ state: 'cancelled', error: null });
        await expect.poll(() => savedRun(simulation)).toMatchObject({ state: 'cancelled' });
    }, RUN_TIMEOUT_MS);
});
