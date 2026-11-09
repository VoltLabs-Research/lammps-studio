import type { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { act, StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditorPanel from '@/modules/editor/components/EditorPanel';
import { useEditorSessionStore } from '@/modules/editor/store/editor-session';
import { call } from '@/shared/api/call';
import { ClientError } from '@/shared/errors/ClientError';
import { usePreferencesStore } from '@/shared/store/preferences';
import { closeSession, useRunSessionStore } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';

vi.mock('@/shared/api/call', () => ({ call: vi.fn() }));
vi.mock('@/shared/utils/storage', () => ({
    readChoice: (_key: string, _choices: readonly string[], fallback: string) => fallback,
    readFlag: (_key: string, fallback: boolean) => fallback,
    writeValue: () => undefined
}));

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const SIMULATION: Simulation = {
    id: 'cu',
    name: 'Cu nanowire tension',
    machineId: 'local',
    folder: 'cu-nanowire-tension',
    entry: 'main.in',
    createdAt: '2026-11-02T16:20:00.000Z',
    updatedAt: '2026-11-09T12:17:00.000Z',
    lastRun: null,
    hasPreview: false
};

const EDITOR_URL = 'about:blank#editor-cu';

let container: HTMLDivElement;
let root: Root;

const render = async () => {
    await act(async () => {
        root.render(<StrictMode><EditorPanel /></StrictMode>);
    });
};

beforeEach(() => {
    vi.mocked(call).mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useEditorSessionStore.setState({ simulationId: null, url: null, status: 'loading', error: null });
    usePreferencesStore.setState({ editor: 'studio' });
    useSimulationsStore.setState({ items: [SIMULATION], status: 'ready' });
    useRunSessionStore.setState({ simulationId: 'cu' });
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    closeSession();
});

describe('the Editor panel', () => {
    it('hosts the editor the agent opened, with no panel head', async () => {
        vi.mocked(call).mockResolvedValue({ url: EDITOR_URL });
        await render();

        expect(container.querySelector('iframe')?.getAttribute('src')).toBe(EDITOR_URL);
        expect(container.querySelector('.panel__head')).toBeNull();
        expect(vi.mocked(call)).toHaveBeenCalledTimes(1);
    });

    it('says when code-server is unavailable and tries again on request', async () => {
        vi.mocked(call).mockRejectedValueOnce(new ClientError('Editor::Unavailable', 503));
        await render();
        expect(container.querySelector('h3')?.textContent).toBe('VS Code isn’t available');
        expect(container.querySelector('iframe')).toBeNull();

        vi.mocked(call).mockResolvedValue({ url: EDITOR_URL });
        const retry = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Try again');
        await act(async () => retry?.click());

        expect(container.querySelector('iframe')?.getAttribute('src')).toBe(EDITOR_URL);
    });

    it('points to the folder instead of opening an editor when files open elsewhere', async () => {
        usePreferencesStore.setState({ editor: 'external' });
        await render();

        expect(container.querySelector('.mono')?.textContent).toBe('cu-nanowire-tension');
        expect(vi.mocked(call)).not.toHaveBeenCalled();
    });
});
