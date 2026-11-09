import type { Run } from '@lammps-studio/contracts/run/domain';
import { act, StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFolderStore } from '@/modules/files/store/folder';
import RunsPanel from '@/modules/runs/components/RunsPanel';
import { call } from '@/shared/api/call';
import { closeSession, useRunSessionStore } from '@/shared/store/run-session';
import { useWorkspaceStore } from '@/shared/store/workspace';

vi.mock('@/shared/api/call', () => ({ call: vi.fn() }));

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const run = (number: number, state: Run['state']): Run => ({
    simulationId: 'cu',
    number,
    state,
    startedAt: new Date().toISOString(),
    endedAt: null,
    progress: { step: 96000, totalSteps: 500000, section: 2, sections: 2, stepsPerSecond: null },
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
    outputDir: `runs/run-${number}`,
    frames: 0,
    warnings: 0
});

let container: HTMLDivElement;
let root: Root;

const rowButton = (title: string): HTMLButtonElement => {
    const button = [...container.querySelectorAll('button.grow')].find((candidate) => candidate.textContent?.startsWith(title));
    if(!(button instanceof HTMLButtonElement)) throw new Error(`no row ${title}`);

    return button;
};

beforeEach(async () => {
    vi.mocked(call).mockResolvedValue([]);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useWorkspaceStore.setState({ panel: 'runs', panelOpen: true });
    useRunSessionStore.setState({ simulationId: 'cu', runs: [run(2, 'cancelled'), run(3, 'building')], runNumber: 3, status: 'ready' });
    await act(async () => {
        root.render(<StrictMode><RunsPanel /></StrictMode>);
    });
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    closeSession();
});

describe('the Runs panel', () => {
    it('views a run and opens its folder in Files', async () => {
        await act(async () => rowButton('Run 2').click());

        expect(useRunSessionStore.getState().runNumber).toBe(2);
        expect(useFolderStore.getState().path).toBe('runs/run-2');
        expect(useWorkspaceStore.getState().panel).toBe('files');
    });

    it('keeps a run that has not started closed', () => {
        expect(rowButton('Run 3').disabled).toBe(true);
        expect(container.querySelector('.panel__sub')?.textContent).toBe('2 runs');
    });
});
