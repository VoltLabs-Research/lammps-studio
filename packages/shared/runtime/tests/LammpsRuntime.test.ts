import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pino from 'pino';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ContainerCreateRequest, ContainerHandle, ContainerManagerPort, ContainerWaitResult, RunContainer } from '../src/ports/ContainerManagerPort';
import { DumpWatch, DumpWatcherPort } from '../src/ports/DumpWatcherPort';
import { LogStreamerPort, LogStreamHandle, LogStreamHandlers } from '../src/ports/LogStreamerPort';
import LammpsRuntime from '../src/public/LammpsRuntime';

const CONTAINER_ID = 'c0ffee';
const BANNER = 'LAMMPS (22 Jul 2025 - Update 1)';

class ScriptedContainers implements ContainerManagerPort{
    created: ContainerCreateRequest[] = [];
    #exit: (result: ContainerWaitResult) => void = () => undefined;
    #exited = new Promise<ContainerWaitResult>((resolve) => {
        this.#exit = resolve;
    });

    async create(request: ContainerCreateRequest): Promise<ContainerHandle>{
        this.created.push(request);
        return { id: CONTAINER_ID };
    }

    async start(){
        this.#exit({ exitCode: 0 });
    }

    wait(): Promise<ContainerWaitResult>{
        return this.#exited;
    }

    async stop(){}

    async remove(){}

    async inspect(): Promise<RunContainer>{
        return {
            id: CONTAINER_ID,
            image: 'image',
            simulationId: 'melt',
            runNumber: 1,
            runDir: '/runs/run-1',
            state: 'running',
            exitCode: null,
            startedAt: null
        };
    }

    async list(): Promise<RunContainer[]>{
        return [await this.inspect()];
    }
}

const printing = (line: string): LogStreamerPort => ({
    stream: async (_: ContainerHandle, handlers: LogStreamHandlers): Promise<LogStreamHandle> => {
        queueMicrotask(() => handlers.onStdout(line));
        return {
            ended: Promise.resolve(),
            close: async () => undefined
        };
    }
});

const noDumps: DumpWatcherPort = {
    watch: async (): Promise<DumpWatch> => ({ flush: async () => undefined, close: async () => undefined }),
    scan: async () => [],
    read: async () => ''
};

describe('LammpsRuntime', () => {
    let simulationDir = '';

    beforeEach(async () => {
        simulationDir = await mkdtemp(path.join(os.tmpdir(), 'lammps-runtime-ports-'));
        await writeFile(path.join(simulationDir, 'main.in'), 'run 10\n');
    });

    afterEach(async () => {
        await rm(simulationDir, { recursive: true, force: true });
    });

    it('runs on the container, log and dump ports the caller hands it', async () => {
        const containers = new ScriptedContainers();
        const runtime = new LammpsRuntime({
            logger: pino({ level: 'silent' }),
            ports: { containerManager: containers, logStreamer: printing(BANNER), dumpWatcher: noDumps }
        });
        const lines: string[] = [];
        runtime.on('simulation:stdout', ({ line }) => lines.push(line));

        const handle = await runtime.run({
            image: 'image',
            simulationId: 'melt',
            simulationDir,
            run: await runtime.prepareRun(simulationDir, 'main.in'),
            execution: { mpiRanks: 2, threadsPerRank: 1, gpus: 0, accelerator: 'none' },
            variables: {}
        });

        expect(await handle.waitForEnd()).toMatchObject({ state: 'completed', exitCode: 0, containerId: CONTAINER_ID });
        expect(lines).toEqual([BANNER]);
        expect(containers.created[0].argv).toEqual(expect.arrayContaining(['lmp', '-in', 'main.in']));
        expect(await runtime.listRunning()).toMatchObject([{ id: CONTAINER_ID, simulationId: 'melt' }]);
    });
});
