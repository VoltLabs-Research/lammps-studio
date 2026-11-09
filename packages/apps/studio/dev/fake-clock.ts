const MS_PER_SECOND = 1000;

export const TICK_MS = 650;
export const TICK_SECONDS = TICK_MS / MS_PER_SECOND;

export const ticksFor = (ms: number): number => Math.max(1, Math.round(ms / TICK_MS));
