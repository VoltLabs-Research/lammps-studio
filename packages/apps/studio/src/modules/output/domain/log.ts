export const LOG_FILE = 'log.lammps';

export type LogFilter = 'all' | 'thermo' | 'warnings';

export interface LogSummary{
    lines: number;
    warnings: number;
    widest: number;
}

export interface LogWindowInput{
    scrollTop: number;
    viewport: number;
    count: number;
}

export interface LogWindow{
    start: number;
    end: number;
}

export interface LogScrollInput{
    count: number;
    follow: boolean;
    resetKey: string;
    startAtTop: boolean;
    onUnfollow: () => void;
}

export interface LogScrollMark{
    resetKey: string;
    count: number;
    follow: boolean;
}

export type ScrollJump = 'top' | 'bottom' | null;

export interface ScrollMetrics{
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}

export interface LogScroll{
    scrollTop: number;
    viewport: number;
    onScroll: () => void;
}
