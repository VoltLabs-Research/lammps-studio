import { Endpoint } from '@lammps-studio/contracts/shared/routing';
import { LogLine, Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { call } from '@/shared/api/call';
import {
    applySessionFrame,
    applySessionLog,
    applySessionRun,
    applySessionThermo,
    closeSession,
    mergeLog,
    mergeThermo,
    openSession,
    selectRun,
    useRunSessionStore
} from '@/shared/store/run-session';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/call', () => ({ call: vi.fn() }));

const run = (number: number, state: Run['state'] = 'completed'): Run => ({
    simulationId: 'cu',
    number,
    state,
    startedAt: '2026-11-01T11:00:00.000Z',
    endedAt: null,
    progress: { step: 0, totalSteps: 5000, section: 1, sections: 1, stepsPerSecond: null },
    error: null,
    config: {
        machineId: 'local',
        version: 'stable',
        packages: [],
        accelerator: 'none',
        mpiRanks: 1,
        threadsPerRank: 1,
        gpus: 0,
        slurm: null,
        entry: 'main.in',
        variables: {}
    },
    buildHash: '3f9a0c21b7e4',
    outputDir: `runs/run-${number}`,
    frames: 0,
    warnings: 0
});

const line = (index: number): LogLine => ({ index, text: `line ${index}`, kind: 'text' });

const section = (number: number, steps: number[]): ThermoSection => ({
    section: number,
    columns: ['Step', 'Temp'],
    rows: steps.map((step) => [step, 300])
});

const serve = (runs: Run[], log: LogLine[] = []) => {
    vi.mocked(call).mockImplementation(async (endpoint: Endpoint<never, unknown>) => {
        if(endpoint === runRoutes.list) return runs;
        if(endpoint === runRoutes.log) return log;
        if(endpoint === simulationRoutes.script) throw new Error('no script');

        return [];
    });
};

describe('merging live output into fetched output', () => {
    it('keeps fetched log lines and appends only newer live ones', () => {
        expect(mergeLog([line(0), line(1), line(2)], [line(2), line(3)]).map((item) => item.index)).toEqual([0, 1, 2, 3]);
    });

    it('appends thermo rows past the last step and adds new sections in order', () => {
        const merged = mergeThermo([section(1, [0, 100])], [section(1, [100, 200]), section(2, [0])]);

        expect(merged.map((item) => item.rows.map((row) => row[0]))).toEqual([[0, 100, 200], [0]]);
    });

    it('returns the same section when nothing new arrived', () => {
        const base = [section(1, [0, 100])];

        expect(mergeThermo(base, [section(1, [100])])[0]).toBe(base[0]);
    });
});

describe('run session', () => {
    beforeEach(() => {
        closeSession();
        vi.mocked(call).mockReset();
    });

    it('opens on the latest run and loads its output', async () => {
        serve([run(2), run(1)], [line(0)]);
        await openSession('cu');

        const state = useRunSessionStore.getState();
        expect(state.runs.map((item) => item.number)).toEqual([1, 2]);
        expect(state.runNumber).toBe(2);
        expect(state.log).toEqual([line(0)]);
        expect(state.status).toBe('ready');
    });

    it('is ready with no run selected when the simulation never ran', async () => {
        serve([]);
        await openSession('cu');

        expect(useRunSessionStore.getState()).toMatchObject({ runNumber: null, status: 'ready' });
    });

    it('follows a new run while viewing the latest one', async () => {
        serve([run(1)], [line(0)]);
        await openSession('cu');
        serve([], []);
        applySessionRun(run(2, 'building'));

        const state = useRunSessionStore.getState();
        expect(state.runNumber).toBe(2);
        expect(state.log).toEqual([]);
    });

    it('stays on an older run the user picked when a new run starts', async () => {
        serve([run(1), run(2)]);
        await openSession('cu');
        await selectRun(1);
        applySessionRun(run(3, 'building'));

        const state = useRunSessionStore.getState();
        expect(state.runNumber).toBe(1);
        expect(state.runs.map((item) => item.number)).toEqual([1, 2, 3]);
    });

    it('applies live log, thermo and frames only for the run being viewed', async () => {
        serve([run(1, 'running')]);
        await openSession('cu');
        applySessionLog({ type: 'run:log', simulationId: 'cu', runNumber: 1, lines: [line(0)] });
        applySessionLog({ type: 'run:log', simulationId: 'cu', runNumber: 9, lines: [line(5)] });
        applySessionLog({ type: 'run:log', simulationId: 'lj', runNumber: 1, lines: [line(6)] });
        applySessionThermo({ type: 'run:thermo', simulationId: 'cu', runNumber: 1, section: 1, columns: ['Step', 'Temp'], rows: [[0, 300]] });
        applySessionFrame({ type: 'run:frame', simulationId: 'cu', runNumber: 1, frame: { index: 0, step: 0, atoms: 10 } });

        const state = useRunSessionStore.getState();
        expect(state.log).toEqual([line(0)]);
        expect(state.thermo).toEqual([section(1, [0])]);
        expect(state.frames).toEqual([{ index: 0, step: 0, atoms: 10 }]);
    });

    it('ignores runs of other simulations', async () => {
        serve([run(1)]);
        await openSession('cu');
        applySessionRun({ ...run(4), simulationId: 'lj' });

        expect(useRunSessionStore.getState().runs.map((item) => item.number)).toEqual([1]);
    });

    it('records a script that cannot be read without failing the session', async () => {
        serve([run(1)]);
        await openSession('cu');
        await vi.waitFor(() => expect(useRunSessionStore.getState().scriptError).toBeInstanceOf(Error));

        expect(useRunSessionStore.getState()).toMatchObject({ script: null, status: 'ready' });
    });
});
