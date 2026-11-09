import { describe, expect, it } from 'vitest';
import type { FrameCursor, FrameSpan } from '@/modules/viewport/domain/workspace';
import { endOfPlay, isFollowing, LIVE_CURSOR, pickAt, playStep, seekTo, shownPosition, startPlaying, stepBack, stepForward, toFirst, toggleLive, toLast } from '@/modules/viewport/utils/frame-cursor';

const running: FrameSpan = { count: 93, running: true };
const finished: FrameSpan = { count: 251, running: false };
const parked = (position: number): FrameCursor => ({ position, live: false });

describe('shownPosition', () => {
    it('follows the newest frame while live', () => {
        expect(shownPosition(LIVE_CURSOR, 93)).toBe(92);
        expect(shownPosition(LIVE_CURSOR, 94)).toBe(93);
    });

    it('holds a parked frame while new frames arrive', () => {
        expect(shownPosition(parked(40), 93)).toBe(40);
        expect(shownPosition(parked(40), 94)).toBe(40);
    });

    it('clamps a parked frame to what exists and shows nothing without frames', () => {
        expect(shownPosition(parked(300), 93)).toBe(92);
        expect(shownPosition(LIVE_CURSOR, 0)).toBe(-1);
    });
});

describe('frame moves', () => {
    it('stops following when stepping back', () => {
        expect(stepBack(LIVE_CURSOR, running)).toEqual(parked(91));
    });

    it('keeps following when stepping forward at the newest frame', () => {
        expect(stepForward(LIVE_CURSOR, running)).toEqual({ position: 92, live: true });
    });

    it('does not start following by stepping onto the newest frame', () => {
        expect(stepForward(parked(91), running)).toEqual(parked(92));
    });

    it('goes to the first frame and stops following', () => {
        expect(toFirst(LIVE_CURSOR, running)).toEqual(parked(0));
    });

    it('follows again from the last frame only while running', () => {
        expect(toLast(running)).toEqual({ position: 92, live: true });
        expect(toLast(finished)).toEqual({ position: 250, live: false });
    });

    it('follows when the ruler is dragged to the end of a running run', () => {
        expect(pickAt(92, running)).toEqual({ position: 92, live: true });
        expect(pickAt(50, running)).toEqual(parked(50));
        expect(pickAt(250, finished)).toEqual(parked(250));
    });

    it('ignores moves when there are no frames', () => {
        expect(seekTo(LIVE_CURSOR, 4, { count: 0, running: true })).toBe(LIVE_CURSOR);
    });
});

describe('toggleLive', () => {
    it('jumps to the newest frame and follows it', () => {
        expect(toggleLive(parked(10), running)).toEqual({ position: 92, live: true });
    });

    it('parks on the shown frame when turned off', () => {
        expect(toggleLive(LIVE_CURSOR, running)).toEqual(parked(92));
    });

    it('only counts as following while the run is running', () => {
        expect(isFollowing(LIVE_CURSOR, running)).toBe(true);
        expect(isFollowing(LIVE_CURSOR, finished)).toBe(false);
    });
});

describe('playback', () => {
    it('restarts from the first frame when it starts at the end', () => {
        expect(startPlaying(LIVE_CURSOR, finished)).toEqual(parked(0));
        expect(startPlaying(parked(30), finished)).toEqual(parked(30));
    });

    it('advances one frame per tick and stops at the newest', () => {
        expect(playStep(parked(30), finished)).toEqual(parked(31));
        expect(playStep(parked(250), finished)).toBeNull();
    });

    it('follows again after playing to the end of a running run', () => {
        expect(endOfPlay(running)).toEqual({ position: 92, live: true });
        expect(endOfPlay(finished)).toEqual({ position: 250, live: false });
    });
});
