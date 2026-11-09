import { describe, expect, it } from 'vitest';
import type { FrameInfo, ThermoSection } from '@lammps-studio/contracts/run/domain';
import { runFixture } from '@/modules/run-control/tests/fixtures';
import type { ViewedFrames } from '@/modules/viewport/domain/workspace';
import { barInfoOf, rulerSpanOf, yieldStepOf } from '@/modules/viewport/utils/frame-info';

const DUMP_EVERY = 2000;
const frames: FrameInfo[] = Array.from({ length: 93 }, (_, index) => ({ index, step: index * DUMP_EVERY, atoms: 17_480 }));

const equilibration: ThermoSection = { section: 0, columns: ['Step', 'Temp'], rows: [[0, 300], [2000, 301]] };
const tension: ThermoSection = {
    section: 1,
    columns: ['Step', 'Temp', 'v_strain', 'v_stress'],
    rows: Array.from({ length: 93 }, (_, index) => [index * DUMP_EVERY, 300, index * 0.002, index < 40 ? index * 0.1 : 4 - (index - 40) * 0.01])
};

const view = (patch: Partial<ViewedFrames> = {}): ViewedFrames => ({
    frames,
    position: 92,
    following: true,
    run: runFixture('running'),
    thermo: [equilibration, tension],
    ...patch
});

describe('barInfoOf', () => {
    it('names the shown step with the strain and stress from thermo at that step', () => {
        expect(barInfoOf(view())).toEqual({ step: 'Step 184,000', meta: 'ε 0.184 · σ 3.48' });
    });

    it('reads the section that has the stress and strain even when steps repeat across sections', () => {
        expect(barInfoOf(view({ position: 1, following: false, run: runFixture('completed') }))?.meta).toBe('ε 0.002 · σ 0.10');
    });

    it('says how far behind a parked frame is while the run goes on', () => {
        expect(barInfoOf(view({ position: 90, following: false }))?.meta).toBe('ε 0.180 · σ 3.50 · 4,000 steps behind');
    });

    it('counts steps before the first dump of a running run', () => {
        expect(barInfoOf(view({ frames: [], position: -1, thermo: [] }))).toEqual({ step: 'Step 184,000', meta: 'no dump yet' });
    });

    it('stays empty without frames once the run is over', () => {
        expect(barInfoOf(view({ frames: [], position: -1, run: runFixture('failed') }))).toBeNull();
    });
});

describe('ruler', () => {
    it('spans from the first frame to the end of the current run', () => {
        expect(rulerSpanOf(frames, runFixture('running'))).toEqual({ startStep: 0, endStep: 500_000 });
    });

    it('marks the yield at the stress peak once the stress has fallen', () => {
        expect(yieldStepOf([equilibration, tension], 'metal')).toBe(80_000);
    });

    it('leaves the marker out while the stress still rises', () => {
        const rising = { ...tension, rows: tension.rows.slice(0, 30) };

        expect(yieldStepOf([rising], 'metal')).toBeNull();
        expect(yieldStepOf([equilibration], 'metal')).toBeNull();
    });
});
