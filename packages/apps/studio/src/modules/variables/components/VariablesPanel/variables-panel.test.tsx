import type { RunConfig } from '@lammps-studio/contracts/run/domain';
import type { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { act, StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VariablesPanel from '@/modules/variables/components/VariablesPanel';
import { useVariablesViewStore } from '@/modules/variables/store/variables-view';
import { useRunDraftStore } from '@/shared/store/run-draft';
import { closeSession, useRunSessionStore } from '@/shared/store/run-session';

vi.mock('@/shared/api/call', () => ({ call: vi.fn() }));

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const SCRIPT: ScriptInfo = {
    entry: 'main.in',
    lines: 52,
    variables: [
        { name: 'T', style: 'index', value: '300', line: 8, overridable: true },
        { name: 'L', style: 'equal', value: '40', line: 11, overridable: false }
    ],
    computes: [],
    fixes: [],
    dumps: [],
    runs: [{ line: 33, steps: 20000 }],
    requiredPackages: [],
    thermoEvery: 1000,
    units: 'metal'
};

const CONFIG: RunConfig = {
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
};

const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

const type = (input: HTMLInputElement, value: string) => {
    act(() => {
        setValue?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

const overrideInput = (name: string): HTMLInputElement => {
    const input = container.querySelector(`#var-${name}`);
    if(!(input instanceof HTMLInputElement)) throw new Error(`no input for ${name}`);

    return input;
};

let container: HTMLDivElement;
let root: Root;

const render = async () => {
    await act(async () => {
        root.render(<StrictMode><VariablesPanel /></StrictMode>);
    });
};

beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useVariablesViewStore.setState({ tab: 'variables' });
    useRunSessionStore.setState({ simulationId: 'cu', status: 'ready', script: SCRIPT });
    useRunDraftStore.getState().setDraft('cu', CONFIG);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    closeSession();
    useRunDraftStore.getState().clearDraft();
});

describe('the Variables panel', () => {
    it('offers an override only for variables the command line can set', async () => {
        await render();

        expect(container.querySelectorAll('.var-input')).toHaveLength(1);
        expect(overrideInput('T').placeholder).toBe('300');
    });

    it('writes an override into the next run and clears it when emptied', async () => {
        await render();

        type(overrideInput('T'), '350');
        expect(useRunDraftStore.getState().config?.variables).toEqual({ T: '350' });
        expect(overrideInput('T').classList.contains('over')).toBe(true);

        type(overrideInput('T'), '  ');
        expect(useRunDraftStore.getState().config?.variables).toEqual({});
    });

    it('resets every override at once', async () => {
        useRunDraftStore.getState().setDraft('cu', { ...CONFIG, variables: { T: '350', seed: '7' } });
        await render();
        const reset = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Reset');

        act(() => reset?.click());

        expect(useRunDraftStore.getState().config?.variables).toEqual({});
        expect(reset?.disabled).toBe(true);
    });

    it('keeps the inputs disabled until there is a next run to write into', async () => {
        useRunDraftStore.getState().clearDraft();
        await render();

        expect(overrideInput('T').disabled).toBe(true);
    });
});
