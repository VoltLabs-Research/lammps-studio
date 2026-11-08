const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const MS_PER_SECOND = 1000;
const GIGABYTE = 1e9;
const MEGABYTE = 1e6;
const KILOBYTE = 1e3;

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const formatInt = (value: number): string => integer.format(Math.round(value));

export const formatPercent = (fraction: number): string => `${Math.round(fraction * 100)}%`;

const hoursAndMinutes = (seconds: number): string => {
    const hours = Math.floor(seconds / HOUR);
    const minutes = Math.round((seconds - hours * HOUR) / MINUTE);
    if(minutes === 0) return `${hours} h`;

    return `${hours} h ${minutes} min`;
};

export const formatDuration = (seconds: number): string => {
    const whole = Math.round(seconds);
    if(whole < MINUTE) return `${whole} s`;
    if(whole >= HOUR) return hoursAndMinutes(whole);

    const minutes = Math.floor(whole / MINUTE);
    const rest = whole - minutes * MINUTE;
    if(rest === 0) return `${minutes} min`;

    return `${minutes} min ${rest} s`;
};

export const formatEta = (seconds: number): string => {
    if(seconds < MINUTE) return `ETA ${Math.max(1, Math.round(seconds))} s`;
    if(seconds < HOUR) return `ETA ${Math.round(seconds / MINUTE)} min`;

    return `ETA ${hoursAndMinutes(seconds)}`;
};

const ago = (count: number, unit: string, previous: string): string => {
    if(count === 1) return previous;

    return `${count} ${unit}s ago`;
};

export const formatAgo = (iso: string, now: number): string => {
    const seconds = Math.max(0, (now - Date.parse(iso)) / MS_PER_SECOND);
    if(seconds < MINUTE) return 'just now';
    if(seconds < HOUR) return `${Math.floor(seconds / MINUTE)} min ago`;
    if(seconds < DAY) return `${Math.floor(seconds / HOUR)} h ago`;
    if(seconds < 2 * DAY) return 'yesterday';
    if(seconds < WEEK) return `${Math.floor(seconds / DAY)} days ago`;
    if(seconds < MONTH) return ago(Math.floor(seconds / WEEK), 'week', 'last week');
    if(seconds < YEAR) return ago(Math.floor(seconds / MONTH), 'month', 'last month');

    return ago(Math.floor(seconds / YEAR), 'year', 'last year');
};

export const formatBytes = (bytes: number): string => {
    if(bytes >= GIGABYTE) return `${(bytes / GIGABYTE).toFixed(1)} GB`;
    if(bytes >= MEGABYTE) return `${Math.round(bytes / MEGABYTE)} MB`;

    return `${Math.round(bytes / KILOBYTE)} KB`;
};

export const secondsBetween = (startIso: string, endIso: string): number => (Date.parse(endIso) - Date.parse(startIso)) / MS_PER_SECOND;
