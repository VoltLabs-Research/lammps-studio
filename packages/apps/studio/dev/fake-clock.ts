const MS_PER_SECOND = 1000;
const STARTING_MS = 1500;
const STOP_GRACE_MS = 2400;

export const TICK_MS = 650;
export const TICK_SECONDS = TICK_MS / MS_PER_SECOND;

const ticksFor = (ms: number): number => Math.max(1, Math.round(ms / TICK_MS));

export const STARTING_TICKS = ticksFor(STARTING_MS);
export const STOP_GRACE_TICKS = ticksFor(STOP_GRACE_MS);
