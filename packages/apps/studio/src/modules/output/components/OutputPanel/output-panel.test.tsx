import { LogLine, Run } from '@lammps-studio/contracts/run/domain';
import { act, StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OutputPanel from '@/modules/output/components/OutputPanel';
import { useOutputViewStore } from '@/modules/output/store/output-view';
import { applySessionLog, closeSession, useRunSessionStore } from '@/shared/store/run-session';

vi.mock('@/shared/api/call', () => ({ call: vi.fn() }));

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const run: Run = {
    simulationId: 'cu',
    number: 3,
    state: 'running',
    startedAt: '2026-11-08T12:18:00.000Z',
    endedAt: null,
    progress: { step: 184_000, totalSteps: 500_000, section: 1, sections: 2, stepsPerSecond: 640 },
    error: null,
    config: {
        machineId: 'local',
        version: 'stable',
        packages: [],
        accelerator: 'omp',
        mpiRanks: 8,
        threadsPerRank: 2,
        gpus: 0,
        slurm: null,
        entry: 'main.in',
        variables: {}
    },
    buildHash: '3f9a0c21b7e4',
    outputDir: 'runs/run-3',
    frames: 0,
    warnings: 0
};

const lines = (from: number, count: number): LogLine[] => Array.from({ length: count }, (_, offset) => ({
    index: from + offset,
    text: `${(from + offset) * 1000} 300.1 -59950.9`,
    kind: 'thermo'
}));

const scrollBody = (container: HTMLElement): HTMLElement => {
    const body = container.querySelector('.panel__body');
    if(!(body instanceof HTMLElement)) throw new Error('no panel body');

    return body;
};

let container: HTMLDivElement;
let root: Root;

const render = async () => {
    await act(async () => {
        root.render(<StrictMode><OutputPanel /></StrictMode>);
    });
};

beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useOutputViewStore.setState({ filter: 'all', follow: true });
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    closeSession();
});

describe('the Output panel', () => {
    it('renders a window of a 100k-line log, not every line', async () => {
        useRunSessionStore.setState({ simulationId: 'cu', runs: [run], runNumber: 3, status: 'ready', log: lines(0, 100_000) });
        await render();

        const rendered = container.querySelectorAll('.log__line').length;
        expect(rendered).toBeGreaterThan(0);
        expect(rendered).toBeLessThan(200);
        expect(container.querySelector('.panel__sub')?.textContent).toBe('log.lammps · run 3 · 100,000 lines · 0 warnings');
    });

    it('keeps the scroll position when lines arrive and the log is not followed', async () => {
        useOutputViewStore.setState({ follow: false });
        useRunSessionStore.setState({ simulationId: 'cu', runs: [run], runNumber: 3, status: 'ready', log: lines(0, 2000) });
        await render();
        const body = scrollBody(container);
        body.scrollTop = 400;

        await act(async () => applySessionLog({ type: 'run:log', simulationId: 'cu', runNumber: 3, lines: lines(2000, 50) }));

        expect(body.scrollTop).toBe(400);
        expect(container.querySelector('.panel__sub')?.textContent).toContain('2,050 lines');
    });

    it('flashes only lines that arrive live', async () => {
        useRunSessionStore.setState({ simulationId: 'cu', runs: [run], runNumber: 3, status: 'ready', log: lines(0, 5) });
        await render();
        expect(container.querySelectorAll('.log__line.new')).toHaveLength(0);

        await act(async () => applySessionLog({ type: 'run:log', simulationId: 'cu', runNumber: 3, lines: lines(5, 2) }));

        expect([...container.querySelectorAll('.log__line.new .n')].map((cell) => cell.textContent)).toEqual(['6', '7']);
    });

    it('shows the filter placeholder when no line matches', async () => {
        useOutputViewStore.setState({ filter: 'warnings' });
        useRunSessionStore.setState({ simulationId: 'cu', runs: [run], runNumber: 3, status: 'ready', log: lines(0, 5) });
        await render();

        expect(container.textContent).toContain('No lines match this filter.');
    });

    it('says the log starts after the build while the run is building', async () => {
        useRunSessionStore.setState({ simulationId: 'cu', runs: [{ ...run, state: 'building' }], runNumber: 3, status: 'ready', log: [] });
        await render();

        expect(container.querySelector('h3')?.textContent).toBe('LAMMPS is being built');
    });
});
