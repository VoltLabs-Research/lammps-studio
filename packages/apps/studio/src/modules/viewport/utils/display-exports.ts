import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { ScriptInfo, UnitStyle } from '@lammps-studio/contracts/script/domain';
import { thermoQuantity } from '@/modules/charts/utils/thermo-quantity';
import type { Legend } from '@/modules/viewport/domain/legend';
import type { ColorMode } from '@/modules/viewport/domain/scene';
import { ENERGY_COLUMN, resolveColorMode, STRUCTURE_COLUMN, TYPE_COLUMN } from '@/modules/viewport/utils/atom-palette';

const BOX_LENGTH_COLUMN = 'Lx';
const COMPUTE_PREFIX = /^c_/;
const IMAGE_SIZE = '1600 1200';
const DEFAULT_IMAGE_EVERY = 1000;
const RADIUS_DIGITS = 2;

const COLOR_COLUMN: Record<ColorMode, string> = {
    structure: STRUCTURE_COLUMN,
    energy: ENERGY_COLUMN,
    type: TYPE_COLUMN
};

export const colorColumnOf = (frame: Frame | null, mode: ColorMode): string => COLOR_COLUMN[frame ? resolveColorMode(frame.header, mode) : mode];

export const radiusText = (radius: number, units: UnitStyle): string => {
    const unit = thermoQuantity(BOX_LENGTH_COLUMN, units).unit;

    return unit === '' ? radius.toFixed(RADIUS_DIGITS) : `${radius.toFixed(RADIUS_DIGITS)} ${unit}`;
};

export const dumpImageCommand = (script: ScriptInfo | null, column: string): string => {
    const every = script?.dumps[0]?.every ?? DEFAULT_IMAGE_EVERY;

    return `dump img all image ${every} img.*.png ${column} type size ${IMAGE_SIZE} box yes 0.02 axes yes 0.6 0.03`;
};

export const colorsFileName = (column: string): string => `${column.replace(COMPUTE_PREFIX, '')}-colors.json`;

export const colorsJson = (legend: Legend): string => {
    if(legend.kind === 'energy') return JSON.stringify({ kind: legend.kind, stops: legend.stops, min: legend.min, max: legend.max, unit: legend.unit }, null, 2);

    return JSON.stringify({ kind: legend.kind, colors: Object.fromEntries(legend.items.map((item) => [item.name, item.color])) }, null, 2);
};
