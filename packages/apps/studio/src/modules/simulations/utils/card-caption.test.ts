import { RunState, RunSummary } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { captionOf, progressOf } from '@/modules/simulations/utils/card-caption';
import { describe, expect, it } from 'vitest';

const NOW = Date.parse('2026-11-08T12:00:00.000Z');
const CONTEXT = { machineName: 'This computer', buildProgress: 0.41, now: NOW };

const run = (state: RunState, patch: Partial<RunSummary> = {}): RunSummary => ({
    number: 3,
    state,
    startedAt: '2026-11-08T09:55:48.000Z',
    endedAt: null,
    progress: { step: 190_000, totalSteps: 500_000, section: 2, sections: 2, stepsPerSecond: 640.82 },
    error: null,
    ...patch
});

const simulation = (lastRun: RunSummary | null, entry: string | null = 'main.in'): Simulation => ({
    id: 'cu',
    name: 'Cu nanowire tension',
    machineId: 'local',
    folder: 'cu-nanowire-tension',
    entry,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-08T10:00:00.000Z',
    lastRun,
    hasPreview: false
});

describe('captionOf', () => {
    it.each([
        ['a draft with no entry script', simulation(null, null), 'Draft', 'No entry script'],
        ['a simulation never run', simulation(null), 'Not run yet', 'This computer'],
        ['a queued run', simulation(run('queued')), 'Queued', 'This computer'],
        ['a building run', simulation(run('building')), 'Building', 'LAMMPS · 41% · This computer'],
        ['a starting run', simulation(run('starting')), 'Starting', 'This computer'],
        ['a running run', simulation(run('running')), 'Running', '38% · ETA 8 min · This computer'],
        ['a stopping run', simulation(run('stopping')), 'Stopping', 'step 190,000 · This computer'],
        ['a stopped run', simulation(run('cancelled')), 'Stopped', 'at step 190,000'],
        ['a finished run', simulation(run('completed', { endedAt: '2026-11-08T10:00:00.000Z' })), 'Finished', '2 h ago · 4 min 12 s']
    ])('leads %s with its state word', (_, subject, word, detail) => {
        expect(captionOf(subject, CONTEXT)).toEqual({ word, detail, danger: false });
    });

    it('shows a failure in red with its step and message', () => {
        const failed = simulation(run('failed', { error: { message: 'Lost atoms', step: 61_200, line: 40 } }));

        expect(captionOf(failed, CONTEXT)).toEqual({ word: 'Failed', detail: 'at step 61,200 · Lost atoms', danger: true });
    });

    it('shows the step of a run with no known length', () => {
        const open = simulation(run('running', { progress: { step: 1200, totalSteps: null, section: 1, sections: 1, stepsPerSecond: 100 } }));

        expect(captionOf(open, CONTEXT).detail).toBe('step 1,200 · This computer');
    });

    it('leaves the ETA out until the speed is known', () => {
        const warming = simulation(run('running', { progress: { step: 0, totalSteps: 500_000, section: 1, sections: 2, stepsPerSecond: null } }));

        expect(captionOf(warming, CONTEXT).detail).toBe('0% · This computer');
    });
});

describe('progressOf', () => {
    it('follows the steps of an active run', () => {
        expect(progressOf(simulation(run('running')), null)).toBeCloseTo(0.38);
    });

    it('follows the build while LAMMPS compiles', () => {
        expect(progressOf(simulation(run('building')), 0.41)).toBe(0.41);
    });

    it('hides the bar once the run is over', () => {
        expect(progressOf(simulation(run('completed')), null)).toBeNull();
        expect(progressOf(simulation(null), null)).toBeNull();
    });
});
