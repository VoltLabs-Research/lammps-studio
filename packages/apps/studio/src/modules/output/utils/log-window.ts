import { LogWindow, LogWindowInput } from '@/modules/output/domain/log';

export const LOG_ROW = 18;
export const LOG_GUTTER = 66;

const PAD_TOP = 8;
const PAD_BOTTOM = 24;
const OVERSCAN = 20;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export const logHeight = (count: number): number => PAD_TOP + count * LOG_ROW + PAD_BOTTOM;

export const logWindow = ({ scrollTop, viewport, count }: LogWindowInput): LogWindow => {
    const first = Math.floor((scrollTop - PAD_TOP) / LOG_ROW);
    const visible = Math.ceil(viewport / LOG_ROW) + 1;

    return {
        start: clamp(first - OVERSCAN, 0, count),
        end: clamp(first + visible + OVERSCAN, 0, count)
    };
};
