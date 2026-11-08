import { execFileSync } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BuildProgressEvent, DumpFrameEvent } from '../src/domain/observability/EventMap';
import { RunExecution, RunSpec } from '../src/domain/simulation/RunSpec';
import { RunState } from '../src/domain/shared/types';
import { STOP_TIMEOUT_SECONDS } from '../src/application/simulations/StopSimulation';
import LammpsRuntime from '../src/public/LammpsRuntime';

const dockerAvailable = (): boolean => {
    try{
        execFileSync('docker', ['info'], { stdio: 'ignore' });
        return true;
    }catch{
        return false;
    }
};

const BUILD_TIMEOUT_MS = 30 * 60 * 1000;
const RUN_TIMEOUT_MS = 2 * 60 * 1000;
const MPIRUN_TERMINATED_EXIT = 1;
const KILL_EXIT = 137;
const SPEC = { version: 'stable_22Jul2025_update1', packages: ['MANYBODY'], accelerator: 'none' as const };
const EXECUTION: RunExecution = { mpiRanks: 2, threadsPerRank: 1, gpus: 0, accelerator: 'none' };

const meltScript = (steps: number): string => `# 3d Lennard-Jones melt
units           lj
atom_style      atomic
lattice         fcc 0.8442
region          box block 0 10 0 10 0 10
create_box      1 box
create_atoms    1 box
mass            1 1.0
velocity        all create \${T} 87287 loop geom
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

describe.skipIf(!dockerAvailable())('LAMMPS in Docker', () => {
    const runtime = new LammpsRuntime({ logger: pino({ level: 'warn' }) });
    let simulationDir = '';
    let image = '';

    const runSpec = async (steps: number, simulationId: string): Promise<RunSpec> => {
        await writeFile(path.join(simulationDir, 'main.in'), meltScript(steps));
        return {
            image,
            simulationId,
            simulationDir,
            run: await runtime.prepareRun(simulationDir, 'main.in'),
            execution: EXECUTION,
            variables: { T: '3.0' }
        };
    };

    beforeAll(async () => {
        simulationDir = await mkdtemp(path.join(os.tmpdir(), 'lammps-runtime-melt-'));
        await writeFile(path.join(simulationDir, 'README.md'), 'LJ melt');

        const progress: BuildProgressEvent[] = [];
        runtime.on('build:progress', (event) => progress.push(event));
        const startedAt = Date.now();
        const build = await runtime.build(SPEC);
        image = build.tag;

        console.info(`[integration] image ${build.tag} ${build.created ? `built in ${((Date.now() - startedAt) / 1000).toFixed(1)} s` : 'already present'}`);
        expect(build.hash).toBe(runtime.describeBuild({ ...SPEC, packages: ['manybody'] }).hash);
        if(build.created){
            expect(progress.at(-1)?.progress).toBe(1);
            expect(progress.at(-1)?.steps.every((step) => step.state === 'done')).toBe(true);
        }
    }, BUILD_TIMEOUT_MS);

    afterAll(async () => {
        await rm(simulationDir, { recursive: true, force: true });
    });

    it('runs a few hundred steps of LJ melt in runs/run-<n> and streams its output and dump frames', async () => {
        const spec = await runSpec(300, 'melt');
        const lines: string[] = [];
        const frames: DumpFrameEvent[] = [];
        const states: RunState[] = [];
        runtime.on('dump:frame', (frame) => frames.push(frame));

        const handle = await runtime.run(spec);
        handle.on('simulation:stdout', ({ line }) => lines.push(line));
        handle.on('simulation:state', ({ state }) => states.push(state));
        const end = await handle.waitForEnd();

        expect(end).toMatchObject({ state: 'completed', exitCode: 0, runNumber: spec.run.number, runDir: spec.run.dir });
        expect(states.at(-1)).toBe('completed');
        expect(lines[0]).toBe('LAMMPS (22 Jul 2025 - Update 1)');
        expect(lines.some((line) => /^\s+300\s/.test(line))).toBe(true);
        expect(lines.some((line) => line.startsWith('Loop time of') && line.includes('for 300 steps with 4000 atoms'))).toBe(true);
        await expect(access(path.join(spec.run.dir, 'log.lammps'))).resolves.toBeUndefined();

        const dump = path.join(spec.run.dir, 'melt.lammpstrj');
        const own = frames.filter((frame) => frame.runId === handle.runId);
        expect(own.map(({ path: file, step, index }) => [file, step, index])).toEqual([0, 100, 200, 300].map((step, index) => [dump, step, index]));

        const third = await runtime.readFrame(dump, own[2].byteOffset);
        expect(third.startsWith('ITEM: TIMESTEP\n200\nITEM: NUMBER OF ATOMS\n4000\n')).toBe(true);
        expect(third.trimEnd().split('\n')).toHaveLength(9 + 4000);
    }, RUN_TIMEOUT_MS);

    it('stops a run with SIGTERM and reports its exit code', async () => {
        const handle = await runtime.run(await runSpec(10_000_000, 'stop'));
        const states: RunState[] = [];
        handle.on('simulation:state', ({ state }) => states.push(state));
        await new Promise<void>((resolve) => {
            const off = handle.on('simulation:stdout', ({ line }) => {
                if(/^\s+50\s/.test(line)){
                    off();
                    resolve();
                }
            });
        });

        const startedAt = Date.now();
        await handle.stop();
        const end = await handle.waitForEnd();

        expect(states).toEqual(['stopping', 'cancelled']);
        expect(end).toMatchObject({ state: 'cancelled', exitCode: MPIRUN_TERMINATED_EXIT });
        expect(Date.now() - startedAt).toBeLessThan(STOP_TIMEOUT_SECONDS * 1000);
    }, RUN_TIMEOUT_MS);

    it('reattaches to a running container from a fresh runtime, as after an agent restart, and kills it', async () => {
        const spec = await runSpec(10_000_000, 'reattach');
        await runtime.run(spec);

        const restarted = new LammpsRuntime({ logger: pino({ level: 'warn' }) });
        const running = await restarted.listRunning();
        const container = running.find((entry) => entry.simulationId === 'reattach');
        expect(container).toMatchObject({ runNumber: spec.run.number, runDir: spec.run.dir, state: 'running' });

        const handle = await restarted.attach(container?.id ?? '');
        const lines: string[] = [];
        const firstLine = new Promise<void>((resolve) => handle.once('simulation:stdout', () => resolve()));
        handle.on('simulation:stdout', ({ line }) => lines.push(line));
        await firstLine;
        await handle.kill();
        const end = await handle.waitForEnd();

        expect(end).toMatchObject({ state: 'cancelled', exitCode: KILL_EXIT });
        expect(lines[0]).toBe('LAMMPS (22 Jul 2025 - Update 1)');
        expect((await restarted.listRunning()).some((entry) => entry.id === container?.id)).toBe(false);
    }, RUN_TIMEOUT_MS);
});
