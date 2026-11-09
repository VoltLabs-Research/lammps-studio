import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { listenToEvents } from '@tests/events';
import { FakeDocker, SIGTERM_EXIT } from '@tests/fakeDocker';
import { writeTree } from '@tests/files';
import { AgentApp, bootAgent, StartedAgent } from '@tests/harness';
import { request } from '@tests/request';
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
    startRun
} from '@tests/runs';
import { createSimulation, folderOf } from '@tests/simulations';
import { Run } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { META_PREFIX } from '@lammps-studio/lammps/log/domain';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const docker = new FakeDocker();
const manybody = identityOf('MANYBODY');
docker.addImage(manybody.tag);

const agents: StartedAgent[] = [];

const boot = async (): Promise<AgentApp> => {
    const agent = await bootAgent(docker.runtime);
    agents.push(agent);

    return agent.app;
};

const goDown = async () => {
    await agents.pop()?.application.stop();
    docker.disconnect();
};

const restart = async (): Promise<AgentApp> => {
    await goDown();

    return boot();
};

const textsOf = async (app: AgentApp, simulation: Simulation): Promise<string[]> => {
    const log = (await request(app, runRoutes.log, { params: { simulationId: simulation.id, runNumber: 1 } })).data();
    expect(log.map((line) => line.index)).toEqual(log.map((_, index) => index));

    return log.map((line) => line.text);
};

const runningMelt = async (app: AgentApp, name: string) => {
    const simulation = await meltSimulation(app, name);
    await startRun(app, simulation);
    const container = await runningContainer(docker, simulation, 1);
    await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'running' });

    return { simulation, container };
};

const savedRun = async (simulation: Simulation): Promise<Run> => JSON.parse(await readFile(join(runDirOf(simulation, 1), 'run.json'), 'utf8')) as Run;

afterEach(async () => {
    docker.unreachable = false;
    while(agents.length > 0) await agents.pop()?.application.stop();
});

describe('reattaching at boot', () => {
    it('follows a running run again after a restart, without repeating the output it already had', async () => {
        const { simulation, container } = await runningMelt(await boot(), 'Followed');
        container.print(...MELT_SETUP, meltRow(0));

        await goDown();
        container.print(meltRow(50));
        const app = await boot();
        const events = await listenToEvents(app);
        container.print(meltRow(100), ...MELT_END);
        container.exit(0);

        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed', progress: { step: 100, totalSteps: 100 } });
        const texts = await textsOf(app, simulation);
        expect(texts[0]).toBe(`studio › run 1 on This computer · build ${manybody.hash}`);
        expect(texts.filter((text) => !text.startsWith(META_PREFIX))).toEqual([...MELT_SETUP, meltRow(0), meltRow(50), meltRow(100), ...MELT_END]);
        const live = eventsOf(events.received, 'run:log').flatMap(({ lines }) => lines);
        expect(live.map(({ text }) => text)).toEqual([meltRow(50), meltRow(100), ...MELT_END, texts.at(-1)]);
        expect(live[0].index).toBe(texts.indexOf(meltRow(0)) + 1);
        await expect.poll(() => readFile(join(runDirOf(simulation, 1), 'screen.log'), 'utf8')).toBe(`${texts.join('\n')}\n`);
    });

    it('settles a run whose container exited while the agent was down', async () => {
        const { simulation, container } = await runningMelt(await boot(), 'Ended offline');
        container.print(...MELT_SETUP, meltRow(0));
        await goDown();

        container.print(meltRow(100), ...MELT_END);
        container.exit(0);
        const app = await boot();

        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'completed', progress: { step: 100 }, endedAt: expect.any(String) });
        expect((await textsOf(app, simulation)).filter((text) => text === meltRow(0))).toHaveLength(1);
        expect(docker.container(simulation.id, 1)).toBeUndefined();
    });

    it('cancels a run whose stop was on its way when the agent went down', async () => {
        const { simulation, container } = await runningMelt(await boot(), 'Stopping offline');
        container.print(...MELT_SETUP, meltRow(0), meltRow(50));
        await goDown();
        const run = await savedRun(simulation);
        await writeTree(folderOf(simulation), { 'runs/run-1/run.json': JSON.stringify({ ...run, state: 'stopping' }) });

        container.exit(SIGTERM_EXIT);
        const app = await boot();

        await expect.poll(() => fetchRun(app, simulation, 1)).toMatchObject({ state: 'cancelled', error: null });
        expect((await textsOf(app, simulation)).slice(-2)).toEqual(['studio › LAMMPS received SIGTERM near step 50', 'studio › run 1 stopped']);
    });

    it('fails a run whose container is gone, and cancels a gone one that was stopping', async () => {
        const app = await boot();
        const lost = await createSimulation(app, { name: 'Lost container' });
        const stopping = await createSimulation(app, { name: 'Lost while stopping' });
        await writeTree(folderOf(lost), {
            'runs/run-1/run.json': JSON.stringify(runRecord(lost.id, 1, manybody.hash, 'running')),
            'runs/run-1/screen.log': `${MELT_SETUP.join('\n')}\n${meltRow(0)}\n${meltRow(50)}\n`
        });
        await writeTree(folderOf(stopping), { 'runs/run-1/run.json': JSON.stringify(runRecord(stopping.id, 1, manybody.hash, 'stopping')) });

        const restarted = await restart();

        expect(await fetchRun(restarted, lost, 1)).toMatchObject({
            state: 'failed',
            endedAt: expect.any(String),
            error: { message: 'The agent was not running when this run ended', step: 50, line: null }
        });
        expect((await textsOf(restarted, lost)).at(-1)).toBe('studio › the agent was not running when this run ended');
        expect(await fetchRun(restarted, stopping, 1)).toMatchObject({ state: 'cancelled', error: null });
    });

    it('leaves the runs as they were recorded when Docker cannot be reached', async () => {
        const app = await boot();
        const simulation = await createSimulation(app, { name: 'Docker down' });
        await writeTree(folderOf(simulation), { 'runs/run-1/run.json': JSON.stringify(runRecord(simulation.id, 1, manybody.hash, 'running')) });
        docker.unreachable = true;

        const restarted = await restart();

        await expect.poll(() => fetchRun(restarted, simulation, 1)).toMatchObject({ state: 'running', endedAt: null });
    });
});
