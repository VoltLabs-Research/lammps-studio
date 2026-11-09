import type { FrameCursor, FrameSpan } from '@/modules/viewport/domain/workspace';

export const LIVE_CURSOR: FrameCursor = {
    position: 0,
    live: true
};

const clampPosition = (position: number, count: number): number => Math.min(Math.max(position, 0), count - 1);

export const shownPosition = (cursor: FrameCursor, count: number): number => {
    if(count === 0) return -1;
    if(cursor.live) return count - 1;

    return clampPosition(cursor.position, count);
};

export const isFollowing = (cursor: FrameCursor, span: FrameSpan): boolean => cursor.live && span.running;

export const seekTo = (cursor: FrameCursor, target: number, span: FrameSpan): FrameCursor => {
    if(span.count === 0) return cursor;

    const position = clampPosition(target, span.count);
    const atEnd = position === span.count - 1;

    return { position, live: span.running && atEnd && cursor.live };
};

export const stepBack = (cursor: FrameCursor, span: FrameSpan): FrameCursor =>
    seekTo({ ...cursor, live: false }, shownPosition(cursor, span.count) - 1, span);

export const stepForward = (cursor: FrameCursor, span: FrameSpan): FrameCursor =>
    seekTo(cursor, shownPosition(cursor, span.count) + 1, span);

export const toFirst = (cursor: FrameCursor, span: FrameSpan): FrameCursor => seekTo(cursor, 0, span);

export const toLast = (span: FrameSpan): FrameCursor => ({ position: Math.max(0, span.count - 1), live: span.running });

export const pickAt = (target: number, span: FrameSpan): FrameCursor => seekTo({ position: target, live: true }, target, span);

export const toggleLive = (cursor: FrameCursor, span: FrameSpan): FrameCursor => {
    if(isFollowing(cursor, span)) return { position: shownPosition(cursor, span.count), live: false };

    return { position: Math.max(0, span.count - 1), live: true };
};

export const startPlaying = (cursor: FrameCursor, span: FrameSpan): FrameCursor => {
    const position = shownPosition(cursor, span.count);

    return { position: position >= span.count - 1 ? 0 : position, live: false };
};

export const playStep = (cursor: FrameCursor, span: FrameSpan): FrameCursor | null => {
    const position = shownPosition(cursor, span.count);
    if(position >= span.count - 1) return null;

    return { position: position + 1, live: false };
};

export const endOfPlay = (span: FrameSpan): FrameCursor => ({ position: Math.max(0, span.count - 1), live: span.running });
