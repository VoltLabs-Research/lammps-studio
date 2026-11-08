import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { ColorMode, ThemeName } from '@/modules/viewport/domain/scene';
import { ENERGY_COLUMN, RAMP_STEPS, resolveColorMode, STRUCTURE_COLUMN, structureColors, structureOf, toBytes, TYPE_COLORS, TYPE_COLUMN, VIRIDIS_RAMP } from '@/modules/viewport/utils/atom-palette';
import { columnRange } from '@/modules/viewport/utils/column-range';

const TYPE_BYTES = toBytes(TYPE_COLORS);
const MIDDLE = 0.5;

const copyColor = (palette: Uint8Array, color: number, out: Uint8Array, atom: number) => {
    out[atom * 3] = palette[color * 3];
    out[atom * 3 + 1] = palette[color * 3 + 1];
    out[atom * 3 + 2] = palette[color * 3 + 2];
};

const fillStructure = (values: Float32Array, theme: ThemeName, out: Uint8Array) => {
    const palette = toBytes(structureColors(theme));

    for(let atom = 0; atom < values.length; atom++){
        copyColor(palette, structureOf(values[atom]), out, atom);
    }
};

const fillEnergy = (values: Float32Array, out: Uint8Array) => {
    const { min, max } = columnRange(values);
    const last = RAMP_STEPS - 1;

    for(let atom = 0; atom < values.length; atom++){
        const t = max > min ? (values[atom] - min) / (max - min) : MIDDLE;

        copyColor(VIRIDIS_RAMP, Math.round(t * last), out, atom);
    }
};

const fillTypes = (frame: Frame, out: Uint8Array) => {
    const types = frame.header.columns.includes(TYPE_COLUMN) ? frame.columns[TYPE_COLUMN] : null;
    const colors = TYPE_COLORS.length;

    for(let atom = 0; atom < frame.header.atoms; atom++){
        const type = types ? Math.round(types[atom]) - 1 : 0;

        copyColor(TYPE_BYTES, ((type % colors) + colors) % colors, out, atom);
    }
};

export const fillAtomColors = (frame: Frame, mode: ColorMode, theme: ThemeName, out: Uint8Array) => {
    const resolved = resolveColorMode(frame.header, mode);

    if(resolved === 'structure'){
        fillStructure(frame.columns[STRUCTURE_COLUMN], theme, out);
        return;
    }
    if(resolved === 'energy'){
        fillEnergy(frame.columns[ENERGY_COLUMN], out);
        return;
    }

    fillTypes(frame, out);
};
