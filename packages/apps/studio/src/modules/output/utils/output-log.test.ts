import { LogLine, LogLineKind } from '@lammps-studio/contracts/run/domain';
import { describe, expect, it } from 'vitest';
import { filterLog } from '@/modules/output/utils/filter-log';
import { nextLineIndex } from '@/modules/output/utils/log-actions';
import { awayFromBottom, scrollJump } from '@/modules/output/utils/log-scroll';
import { outputSub, summarizeLog } from '@/modules/output/utils/log-summary';
import { LOG_ROW, logHeight, logWindow } from '@/modules/output/utils/log-window';

const line = (index: number, kind: LogLineKind, text = `line ${index}`): LogLine => ({ index, text, kind });

const LOG: LogLine[] = [
    line(0, 'meta', 'studio › run 3 on This computer'),
    line(1, 'head', 'LAMMPS (22 Jul 2025 - Update 1)'),
    line(2, 'text', 'Created 22860 atoms'),
    line(3, 'head', 'Step Temp PotEng'),
    line(4, 'thermo', '0 300 -59966.037'),
    line(5, 'warning', 'WARNING: Too many neighbors in CNA for 3 atoms'),
    line(6, 'thermo', '1000 299.5 -59958.6'),
    line(7, 'error', 'ERROR on proc 5: Neighbor list overflow')
];

describe('filtering the log', () => {
    it('keeps every line for All', () => {
        expect(filterLog(LOG, 'all')).toBe(LOG);
    });

    it('keeps thermo rows and their headers for Thermo', () => {
        expect(filterLog(LOG, 'thermo').map((item) => item.index)).toEqual([1, 3, 4, 6]);
    });

    it('keeps warnings and errors for Warnings', () => {
        expect(filterLog(LOG, 'warnings').map((item) => item.index)).toEqual([5, 7]);
    });
});

describe('summarising the log for the panel head', () => {
    it('counts lines and warnings and finds the widest line', () => {
        expect(summarizeLog(LOG)).toEqual({ lines: 8, warnings: 1, widest: 46 });
    });

    it('names the run and pluralises the counts', () => {
        expect(outputSub(summarizeLog(LOG), 3, false)).toBe('log.lammps · run 3 · 8 lines · 1 warning');
        expect(outputSub(summarizeLog(LOG.slice(0, 1)), 3, false)).toBe('log.lammps · run 3 · 1 line · 0 warnings');
    });

    it('adds the error when the run failed', () => {
        expect(outputSub(summarizeLog(LOG), 3, true)).toBe('log.lammps · run 3 · 8 lines · 1 warning · 1 error');
    });

    it('shows only the file and run before the first line', () => {
        expect(outputSub(summarizeLog([]), 4, false)).toBe('log.lammps · run 4');
        expect(outputSub(summarizeLog([]), null, false)).toBe('log.lammps');
    });

    it('groups large line counts', () => {
        const many = Array.from({ length: 12_345 }, (_, index) => line(index, 'text'));

        expect(outputSub(summarizeLog(many), 1, false)).toBe('log.lammps · run 1 · 12,345 lines · 0 warnings');
    });
});

describe('windowing a long log', () => {
    it('renders only the rows around the viewport', () => {
        const window = logWindow({ scrollTop: 50_000 * LOG_ROW, viewport: 900, count: 100_000 });

        expect(window.start).toBeGreaterThan(49_900);
        expect(window.end).toBeLessThan(50_100);
        expect(window.end - window.start).toBeLessThan(100);
    });

    it('covers the visible rows with overscan on both sides', () => {
        const scrollTop = 1000 * LOG_ROW;
        const { start, end } = logWindow({ scrollTop, viewport: 360, count: 5000 });
        const firstVisible = Math.floor(scrollTop / LOG_ROW);

        expect(start).toBeLessThan(firstVisible);
        expect(end).toBeGreaterThan(firstVisible + 360 / LOG_ROW);
    });

    it('clamps to the ends of the log', () => {
        expect(logWindow({ scrollTop: 0, viewport: 900, count: 10 })).toEqual({ start: 0, end: 10 });
        expect(logWindow({ scrollTop: 1e9, viewport: 900, count: 10 })).toEqual({ start: 10, end: 10 });
    });

    it('sizes the scroll area for every row plus the padding', () => {
        expect(logHeight(100_000) - logHeight(0)).toBe(100_000 * LOG_ROW);
    });
});

describe('scrolling the log', () => {
    const mark = (resetKey: string, count: number, follow: boolean) => ({ resetKey, count, follow });

    it('starts at the bottom when following and at the top otherwise', () => {
        expect(scrollJump(null, mark('3:all', 10, true), false)).toBe('bottom');
        expect(scrollJump(null, mark('3:all', 10, false), false)).toBe('top');
    });

    it('opens the warnings at the top even when following', () => {
        expect(scrollJump(mark('3:all', 10, true), mark('3:warnings', 2, true), true)).toBe('top');
    });

    it('jumps when the run or the filter changes', () => {
        expect(scrollJump(mark('2:all', 10, true), mark('3:all', 10, true), false)).toBe('bottom');
    });

    it('sticks to new lines while following', () => {
        expect(scrollJump(mark('3:all', 10, true), mark('3:all', 12, true), false)).toBe('bottom');
    });

    it('keeps the position when new lines arrive and the log is not followed', () => {
        expect(scrollJump(mark('3:all', 10, false), mark('3:all', 12, false), false)).toBeNull();
    });

    it('goes to the bottom when following is turned on', () => {
        expect(scrollJump(mark('3:all', 10, false), mark('3:all', 10, true), false)).toBe('bottom');
    });

    it('stays put when nothing changed', () => {
        expect(scrollJump(mark('3:all', 10, true), mark('3:all', 10, true), false)).toBeNull();
    });

    it('treats a scroll within a row of the end as still at the bottom', () => {
        expect(awayFromBottom({ scrollTop: 990, scrollHeight: 2000, clientHeight: 1000 })).toBe(false);
        expect(awayFromBottom({ scrollTop: 900, scrollHeight: 2000, clientHeight: 1000 })).toBe(true);
    });
});

describe('the next line index', () => {
    it('follows the last line', () => {
        expect(nextLineIndex(LOG)).toBe(8);
        expect(nextLineIndex([])).toBe(0);
    });
});
