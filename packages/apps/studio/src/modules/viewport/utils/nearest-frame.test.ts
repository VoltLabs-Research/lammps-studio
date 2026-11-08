import { describe, expect, it } from 'vitest';
import { nearestFrame } from '@/modules/viewport/utils/nearest-frame';

const FRAMES = [0, 2000, 4000, 6000].map((step, index) => ({ index, step, atoms: 10 }));

describe('nearestFrame', () => {
    it.each([
        [-500, 0],
        [900, 0],
        [1100, 1],
        [4900, 2],
        [5100, 3],
        [480000, 3]
    ])('snaps step %d to frame %d', (step, position) => {
        expect(nearestFrame(FRAMES, step)).toBe(position);
    });

    it('handles a single frame', () => {
        expect(nearestFrame(FRAMES.slice(0, 1), 3000)).toBe(0);
    });
});
