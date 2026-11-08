import type { FrameHeader } from '@lammps-studio/contracts/run/frame';
import type { ColorMode, Rgb, ThemeName } from '@/modules/viewport/domain/scene';

export const STRUCTURE_COLUMN = 'c_cna';
export const ENERGY_COLUMN = 'c_pe';
export const TYPE_COLUMN = 'type';

export const STRUCTURE_NAMES = ['FCC', 'HCP', 'BCC', 'ICO', 'Other'];

const OTHER = 4;
const CNA_TO_STRUCTURE = [OTHER, 0, 1, 2, 3, OTHER];

const STRUCTURE_COLORS: Record<ThemeName, string[]> = {
    dark: ['#66d96b', '#ff6b6b', '#6f86ff', '#f2cc33', '#e4e4e8'],
    light: ['#52c45a', '#ec5656', '#5468ee', '#e0b425', '#a3a7b3']
};

export const VIRIDIS = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];

export const TYPE_COLORS = ['#c98146', '#5b8def', '#3fb6a8', '#d9617e', '#e3b23c', '#8f72d8', '#9bb04a', '#8b93a5'];

const RAMP_SIZE = 256;
const BYTE = 255;
const HEX_RED = 1;
const HEX_GREEN = 3;
const HEX_BLUE = 5;
const HEX_PAIR = 2;
const HEX_RADIX = 16;

export const hexToRgb = (hex: string): Rgb => {
    const channel = (from: number) => parseInt(hex.slice(from, from + HEX_PAIR), HEX_RADIX) / BYTE;

    return [channel(HEX_RED), channel(HEX_GREEN), channel(HEX_BLUE)];
};

export const structureOf = (cna: number): number => {
    return CNA_TO_STRUCTURE[Math.round(cna)] ?? OTHER;
};

export const structureColors = (theme: ThemeName): string[] => {
    return STRUCTURE_COLORS[theme];
};

export const typeColor = (type: number): string => {
    const index = (Math.round(type) - 1) % TYPE_COLORS.length;

    return TYPE_COLORS[index < 0 ? index + TYPE_COLORS.length : index];
};

export const toBytes = (colors: string[]): Uint8Array => {
    const bytes = new Uint8Array(colors.length * 3);

    colors.forEach((color, index) => {
        const [r, g, b] = hexToRgb(color);
        bytes[index * 3] = Math.round(r * BYTE);
        bytes[index * 3 + 1] = Math.round(g * BYTE);
        bytes[index * 3 + 2] = Math.round(b * BYTE);
    });

    return bytes;
};

const buildRamp = (): Uint8Array => {
    const stops = VIRIDIS.map(hexToRgb);
    const ramp = new Uint8Array(RAMP_SIZE * 3);

    for(let i = 0; i < RAMP_SIZE; i++){
        const t = (i / (RAMP_SIZE - 1)) * (stops.length - 1);
        const lower = Math.min(stops.length - 2, Math.floor(t));
        const fraction = t - lower;

        for(let channel = 0; channel < 3; channel++){
            const value = stops[lower][channel] + (stops[lower + 1][channel] - stops[lower][channel]) * fraction;
            ramp[i * 3 + channel] = Math.round(value * BYTE);
        }
    }

    return ramp;
};

export const VIRIDIS_RAMP = buildRamp();
export const RAMP_STEPS = RAMP_SIZE;

export const resolveColorMode = (header: FrameHeader, mode: ColorMode): ColorMode => {
    if(mode === 'structure' && !header.columns.includes(STRUCTURE_COLUMN)){
        return 'type';
    }
    if(mode === 'energy' && !header.columns.includes(ENERGY_COLUMN)){
        return 'type';
    }

    return mode;
};
