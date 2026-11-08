import { describe, expect, it } from 'vitest';
import type { Frame } from '@lammps-studio/contracts/run/frame';
import { fillAtomColors } from '@/modules/viewport/utils/atom-colors';
import { hexToRgb, resolveColorMode, structureOf } from '@/modules/viewport/utils/atom-palette';
import { estimateAtomRadius, FALLBACK_RADIUS } from '@/modules/viewport/utils/estimate-atom-radius';
import { fitDistance } from '@/modules/viewport/utils/fit-distance';
import { legendFor } from '@/modules/viewport/utils/legend-for';

const FCC_BASIS = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];

const fccLattice = (constant: number, cells: number): Float32Array => {
    const positions: number[] = [];

    for(let i = 0; i < cells; i++){
        for(let j = 0; j < cells; j++){
            for(let k = 0; k < cells; k++){
                for(const [a, b, c] of FCC_BASIS){
                    positions.push((i + a) * constant, (j + b) * constant, (k + c) * constant);
                }
            }
        }
    }

    return Float32Array.from(positions);
};

const frameOf = (columns: Record<string, number[]>): Frame => {
    const atoms = Object.values(columns)[0].length;

    return {
        header: {
            step: 0,
            atoms,
            box: { low: [0, 0, 0], high: [1, 1, 1] },
            columns: Object.keys(columns)
        },
        positions: new Float32Array(atoms * 3),
        columns: Object.fromEntries(Object.entries(columns).map(([name, values]) => [name, Float32Array.from(values)]))
    };
};

describe('estimateAtomRadius', () => {
    it('is half the nearest-neighbour distance of an fcc crystal', () => {
        expect(estimateAtomRadius(fccLattice(3.615, 6))).toBeCloseTo(3.615 / Math.SQRT2 / 2, 3);
    });

    it('follows the lattice in reduced units', () => {
        expect(estimateAtomRadius(fccLattice(1.5874, 5))).toBeCloseTo(1.5874 / Math.SQRT2 / 2, 3);
    });

    it('handles a flat sheet of atoms', () => {
        const sheet = new Float32Array(Array.from({ length: 100 }, (_, i) => [i % 10, Math.floor(i / 10), 0]).flat());

        expect(estimateAtomRadius(sheet)).toBeCloseTo(0.5);
    });

    it('falls back for a lone atom', () => {
        expect(estimateAtomRadius(new Float32Array([1, 2, 3]))).toBe(FALLBACK_RADIUS);
    });
});

describe('fitDistance', () => {
    const base = {
        size: [20, 40, 60] as [number, number, number],
        theta: 0,
        phi: 0,
        fov: 90,
        width: 148,
        height: 148,
        bottomInset: 0
    };

    it('fits the projected height into the free space above the bar', () => {
        expect(fitDistance(base)).toBeCloseTo(30 / (100 / 148));
        expect(fitDistance({ ...base, bottomInset: 20 })).toBeCloseTo(30 / (80 / 148));
    });

    it('never squeezes the subject below 45% of the height', () => {
        expect(fitDistance({ ...base, bottomInset: 90 })).toBeCloseTo(30 / 0.45);
    });

    it('leaves the mockup room either side when the width is the tighter side', () => {
        expect(fitDistance({ ...base, size: [20, 400, 60] })).toBeCloseTo(200 * 1.68);
    });
});

describe('structureOf', () => {
    it('maps LAMMPS cna/atom codes onto FCC, HCP, BCC, ICO and Other', () => {
        expect([0, 1, 2, 3, 4, 5].map(structureOf)).toEqual([4, 0, 1, 2, 3, 4]);
    });
});

describe('resolveColorMode', () => {
    it('falls back to type colours when the column is missing', () => {
        const frame = frameOf({ type: [1] });

        expect(resolveColorMode(frame.header, 'structure')).toBe('type');
        expect(resolveColorMode(frame.header, 'energy')).toBe('type');
        expect(resolveColorMode(frame.header, 'type')).toBe('type');
    });
});

describe('fillAtomColors', () => {
    it('paints structures with the theme palette', () => {
        const out = new Uint8Array(6);

        fillAtomColors(frameOf({ c_cna: [1, 0] }), 'structure', 'light', out);

        expect(Array.from(out.slice(0, 3))).toEqual(hexToRgb('#52c45a').map((v) => Math.round(v * 255)));
        expect(Array.from(out.slice(3))).toEqual(hexToRgb('#a3a7b3').map((v) => Math.round(v * 255)));
    });

    it('spreads energy over the viridis ramp from the lowest to the highest atom', () => {
        const out = new Uint8Array(6);

        fillAtomColors(frameOf({ c_pe: [-3.5, -3] }), 'energy', 'dark', out);

        expect(Array.from(out.slice(0, 3))).toEqual([0x44, 0x01, 0x54]);
        expect(Array.from(out.slice(3))).toEqual([0xfd, 0xe7, 0x25]);
    });
});

describe('legendFor', () => {
    it('lists the structures present with their share of atoms', () => {
        const legend = legendFor(frameOf({ c_cna: [1, 1, 1, 2, 0] }), 'structure', 'metal', 'dark');

        expect(legend).toEqual({
            kind: 'structure',
            items: [
                { name: 'FCC', color: '#66d96b', count: 3, share: 0.6 },
                { name: 'HCP', color: '#ff6b6b', count: 1, share: 0.2 },
                { name: 'Other', color: '#e4e4e8', count: 1, share: 0.2 }
            ]
        });
    });

    it('gives the energy ramp its range and unit', () => {
        const legend = legendFor(frameOf({ c_pe: [-3.56, -2.98, -3.1] }), 'energy', 'metal', 'light');

        expect(legend).toMatchObject({ kind: 'energy', unit: 'eV' });
        expect(legend.kind === 'energy' && legend.min).toBeCloseTo(-3.56);
        expect(legend.kind === 'energy' && legend.max).toBeCloseTo(-2.98);
    });

    it('counts atoms per type in order', () => {
        const legend = legendFor(frameOf({ type: [2, 1, 2] }), 'type', 'metal', 'light');

        expect(legend.kind === 'type' && legend.items.map((item) => [item.name, item.count])).toEqual([['1', 1], ['2', 2]]);
    });
});
