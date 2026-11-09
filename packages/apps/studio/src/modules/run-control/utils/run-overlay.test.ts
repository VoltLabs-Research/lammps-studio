import { describe, expect, it } from 'vitest';
import { overlayOf } from '@/modules/run-control/utils/run-overlay';

describe('overlayOf', () => {
    it.each([
        ['noscript', 'picker'],
        ['idle', 'idle'],
        ['building', 'building'],
        ['starting', 'starting']
    ] as const)('covers a %s viewport with the %s overlay', (phase, overlay) => {
        expect(overlayOf(phase, false)).toBe(overlay);
    });

    it.each(['queued', 'running', 'stopping', 'cancelled', 'completed', 'failed'] as const)('leaves the atoms of a %s run in view', (phase) => {
        expect(overlayOf(phase, false)).toBeNull();
    });

    it('asks for an entry script again when the user changes it', () => {
        expect(overlayOf('idle', true)).toBe('picker');
        expect(overlayOf('completed', true)).toBe('picker');
    });
});
