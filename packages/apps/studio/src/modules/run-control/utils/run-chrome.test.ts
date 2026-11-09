import { describe, expect, it } from 'vitest';
import { buildFixture, NOW, runFixture as run, simulationFixture } from '@/modules/run-control/tests/fixtures';
import { runButtonOf } from '@/modules/run-control/utils/run-button';
import { runChipOf } from '@/modules/run-control/utils/run-chip';
import { runPhaseOf } from '@/modules/run-control/utils/run-phase';

const build = buildFixture({ status: 'building', progress: 0.42, buildSeconds: null, createdAt: '2026-11-08T11:57:00.000Z' });
const CONTEXT = { build, machineName: 'This computer', now: NOW };
const withScript = simulationFixture();
const withoutScript = simulationFixture({ entry: null });

describe('runPhaseOf', () => {
    it('asks for an entry script before the first run', () => {
        expect(runPhaseOf(withoutScript, null)).toBe('noscript');
    });

    it('waits for the first run', () => {
        expect(runPhaseOf(withScript, null)).toBe('idle');
    });

    it('follows an active run even when the entry was cleared', () => {
        expect(runPhaseOf(withoutScript, run('running'))).toBe('running');
    });

    it('takes the state of the last run', () => {
        expect(runPhaseOf(withScript, run('failed'))).toBe('failed');
    });
});

describe('runChipOf', () => {
    it('stays out of the header before the first run', () => {
        expect(runChipOf(withScript, null, CONTEXT)).toBeNull();
    });

    it.each([
        ['queued', run('queued'), 'Queued', 'This computer'],
        ['building', run('building'), 'Building LAMMPS', '42% · about 4 min left'],
        ['starting', run('starting'), 'Starting', ''],
        ['running', run('running'), 'Running', '37% · ETA 8 min'],
        ['stopping', run('stopping'), 'Stopping', 'step 184,000'],
        ['cancelled', run('cancelled'), 'Stopped', 'step 184,000 of 500,000'],
        ['completed', run('completed', { endedAt: '2026-11-08T11:53:31.000Z' }), 'Completed', '13 min 31 s']
    ])('names a %s run with its figure', (_, subject, label, meta) => {
        expect(runChipOf(withScript, subject, CONTEXT)).toEqual({ label, meta, tone: 'neutral', jump: 'output' });
    });

    it('shows a failure in red near the step LAMMPS reported', () => {
        const failed = run('failed', { error: { message: 'Neighbor list overflow', step: 231_400, line: 52 } });

        expect(runChipOf(withScript, failed, CONTEXT)).toEqual({ label: 'Failed', meta: 'near step 231,400', tone: 'danger', jump: 'output' });
    });

    it('sends a folder without a script to the editor', () => {
        expect(runChipOf(withoutScript, null, CONTEXT)).toEqual({ label: 'No entry script', meta: '', tone: 'warn', jump: 'editor' });
    });

    it('counts steps when the run length is unknown', () => {
        const open = run('running', { progress: { step: 1200, totalSteps: null, section: 1, sections: 1, stepsPerSecond: 100 } });

        expect(runChipOf(withScript, open, CONTEXT)?.meta).toBe('step 1,200');
    });

    it('leaves the ETA out until the speed is known', () => {
        const warming = run('running', { progress: { step: 0, totalSteps: 500_000, section: 2, sections: 2, stepsPerSecond: null } });

        expect(runChipOf(withScript, warming, CONTEXT)?.meta).toBe('0%');
    });

    it('counts the steps of an earlier run section, whose length is not the whole run', () => {
        const equilibrating = run('running', { progress: { step: 12_000, totalSteps: 20_000, section: 1, sections: 2, stepsPerSecond: 640 } });

        expect(runChipOf(withScript, equilibrating, CONTEXT)?.meta).toBe('section 1 of 2 · 12,000 of 20,000 steps');
    });

    it('names no step for a failure before the first step', () => {
        const unbuilt = run('failed', { progress: { step: 0, totalSteps: 20_000, section: 1, sections: 2, stepsPerSecond: null }, error: { message: 'The LAMMPS build failed: exit 2', step: null, line: null } });

        expect(runChipOf(withScript, unbuilt, CONTEXT)?.meta).toBe('');
    });

    it('falls back to the last progress when LAMMPS exits without naming a step', () => {
        const crashed = run('failed', { error: { message: 'LAMMPS exited with code 1', step: null, line: null } });

        expect(runChipOf(withScript, crashed, CONTEXT)?.meta).toBe('near step 184,000');
    });

    it('leaves the time left out until the build has made progress', () => {
        expect(runChipOf(withScript, run('building'), { ...CONTEXT, build: { ...build, progress: 0 } })?.meta).toBe('0%');
    });
});

describe('runButtonOf', () => {
    it('runs a simulation that has not run yet, with the run menu', () => {
        expect(runButtonOf('idle')).toMatchObject({ label: 'Run', variant: 'primary', action: 'run', menu: 'run' });
    });

    it.each(['cancelled', 'completed', 'failed'] as const)('offers to run again once a run is %s', (phase) => {
        expect(runButtonOf(phase)).toMatchObject({ label: 'Run again', action: 'run', menu: 'run' });
    });

    it('stops a running run and keeps kill in its menu', () => {
        expect(runButtonOf('running')).toMatchObject({ label: 'Stop', variant: 'danger', action: 'stop', menu: 'active' });
    });

    it('cancels a build without a menu', () => {
        expect(runButtonOf('building')).toMatchObject({ label: 'Cancel build', variant: 'secondary', action: 'stop', menu: null });
    });

    it('disables the button while LAMMPS starts or stops', () => {
        expect(runButtonOf('starting')).toMatchObject({ action: null, spin: true, menu: null });
        expect(runButtonOf('stopping')).toMatchObject({ action: null, spin: true, menu: 'active' });
    });

    it('cannot run a folder without an entry script', () => {
        expect(runButtonOf('noscript')).toMatchObject({ label: 'Run', action: null, menu: null });
    });
});
