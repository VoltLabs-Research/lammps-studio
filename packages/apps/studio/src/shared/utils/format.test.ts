import { formatAgo, formatBytes, formatDay, formatDayTime, formatDuration, formatEta, formatInt } from '@/shared/utils/format';
import { describe, expect, it } from 'vitest';

const NOW = Date.parse('2026-11-08T12:00:00.000Z');
const before = (seconds: number): string => new Date(NOW - seconds * 1000).toISOString();

describe('formatDuration', () => {
    it.each([
        [38, '38 s'],
        [252, '4 min 12 s'],
        [780, '13 min'],
        [11_400, '3 h 10 min'],
        [7200, '2 h']
    ])('formats %d s as %s', (seconds, text) => {
        expect(formatDuration(seconds)).toBe(text);
    });
});

describe('formatEta', () => {
    it.each([
        [0.2, 'ETA 1 s'],
        [42, 'ETA 42 s'],
        [483.7, 'ETA 8 min'],
        [11_400, 'ETA 3 h 10 min']
    ])('formats %d s as %s', (seconds, text) => {
        expect(formatEta(seconds)).toBe(text);
    });
});

describe('formatAgo', () => {
    it.each([
        [20, 'just now'],
        [600, '10 min ago'],
        [7200, '2 h ago'],
        [30 * 3600, 'yesterday'],
        [3 * 86_400, '3 days ago'],
        [8 * 86_400, 'last week'],
        [15 * 86_400, '2 weeks ago'],
        [70 * 86_400, '2 months ago']
    ])('formats %d s ago as %s', (seconds, text) => {
        expect(formatAgo(before(seconds), NOW)).toBe(text);
    });
});

describe('numbers', () => {
    it('groups thousands', () => {
        expect(formatInt(61_200)).toBe('61,200');
    });

    it('formats sizes', () => {
        expect(formatBytes(1_400_000_000)).toBe('1.4 GB');
        expect(formatBytes(612_000_000)).toBe('612 MB');
    });
});

describe('days', () => {
    const now = new Date(2026, 10, 9, 14, 0).getTime();
    const at = (month: number, day: number, hour: number, minute: number, year = 2026): string => new Date(year, month, day, hour, minute).toISOString();

    it('names today and yesterday, then the date, and the year only when it differs', () => {
        expect(formatDay(at(10, 9, 0, 5), now)).toBe('Today');
        expect(formatDay(at(10, 8, 23, 59), now)).toBe('Yesterday');
        expect(formatDay(at(10, 2, 16, 20), now)).toBe('Nov 2');
        expect(formatDay(at(11, 30, 9, 0, 2025), now)).toBe('Dec 30, 2025');
    });

    it('adds a 24-hour clock', () => {
        expect(formatDayTime(at(10, 9, 9, 40), now)).toBe('Today at 09:40');
        expect(formatDayTime(at(10, 2, 16, 20), now)).toBe('Nov 2 at 16:20');
    });
});
