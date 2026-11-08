import { describe, expect, it } from 'vitest';
import custom from './fixtures/custom.lammpstrj?raw';
import xyz from './fixtures/positions.xyz?raw';
import triclinic from './fixtures/triclinic-atom.lammpstrj?raw';
import unitsTime from './fixtures/units-time.lammpstrj?raw';
import { parseDump, parseDumpFrame } from '../src/dump/parse-dump';

const CUBE_EDGE = 5.0387885741475218;

const positionOf = (positions: Float32Array, atom: number): number[] => [...positions.subarray(atom * 3, atom * 3 + 3)];

describe('parseDump', () => {
    it.each([
        ['custom', custom, [0, 20, 40, 60], ['type', 'c_pe', 'c_ke', 'v_speed']],
        ['xyz', xyz, [0, 30, 60], ['type']],
        ['atom on a triclinic box', triclinic, [0, 10, 20], ['type']],
        ['custom with UNITS and TIME items', unitsTime, [0, 5, 10], ['type', 'vx']]
    ])('reads every frame of a %s dump', (_, text, steps, columns) => {
        const frames = parseDump(text);

        expect(frames.map((frame) => frame.header.step)).toEqual(steps);
        expect(frames.every((frame) => frame.header.columns.join() === columns.join())).toBe(true);
        expect(frames.every((frame) => frame.positions.length === frame.header.atoms * 3)).toBe(true);
    });

    it('keys per-atom columns by name as Float32Arrays, without the id', () => {
        const last = parseDump(custom).at(-1);

        expect(last?.header.atoms).toBe(108);
        expect(Object.keys(last?.columns ?? {})).toEqual(['type', 'c_pe', 'c_ke', 'v_speed']);
        expect(last?.columns.c_pe).toBeInstanceOf(Float32Array);
        expect(positionOf(last?.positions ?? new Float32Array(), 107)).toEqual([3.27791, 4.01169, 4.17716].map(Math.fround));
        expect([last?.columns.type[107], last?.columns.c_pe[107], last?.columns.c_ke[107], last?.columns.v_speed[107]])
            .toEqual([1, -6.1899, 1.39038, 1.66756].map(Math.fround));
    });

    it('reads the type of every atom', () => {
        const [first] = parseDump(custom);
        const types = [...first.columns.type];

        expect(types.filter((type) => type === 1)).toHaveLength(89);
        expect(types.filter((type) => type === 2)).toHaveLength(19);
    });

    it('reads an orthogonal box', () => {
        expect(parseDump(custom)[0].header.box).toEqual({ low: [0, 0, 0], high: [CUBE_EDGE, CUBE_EDGE, CUBE_EDGE] });
    });

    it('unscales xs ys zs through the triclinic tilt and reports the bounding box', () => {
        const [first] = parseDump(triclinic);

        expect(first.header.box).toEqual({ low: [0, 0, 0], high: [4.8708289550092703, 3.6951116210415158, 3.3591923827650145] });
        positionOf(first.positions, 1).forEach((value, axis) => expect(value).toBeCloseTo([0.839798, 0.839798, 0][axis], 5));
        positionOf(first.positions, 5).forEach((value, axis) => expect(value).toBeCloseTo([3.359192, 0.839798, 0.839798][axis], 5));
    });

    it('takes the step from an xyz comment and the box from the atoms', () => {
        const second = parseDump(xyz)[1];

        expect(second.header.step).toBe(30);
        expect(positionOf(second.positions, 0)).toEqual([5.01938, 4.95229, 4.73863].map(Math.fround));
        expect(second.columns.type[0]).toBe(2);
        expect(second.header.box.low.every((value, axis) => value <= second.header.box.high[axis])).toBe(true);
    });

    it('maps element names to 1-based types in the order they appear', () => {
        const frame = parseDumpFrame('3\n Atoms. Timestep: 7\nCu 0 0 0\nNi 1 0 0\nCu 0 1 0\n');

        expect(frame.header.step).toBe(7);
        expect([...frame.columns.type]).toEqual([1, 2, 1]);
    });

    it('reads a single frame cut out of the middle of a file', () => {
        const start = custom.indexOf('ITEM: TIMESTEP\n40\n');
        const end = custom.indexOf('ITEM: TIMESTEP\n60\n');

        expect(parseDumpFrame(custom.slice(start, end)).header.step).toBe(40);
    });

    it.each([
        ['a frame cut short', custom.slice(0, custom.indexOf('ITEM: TIMESTEP\n20\n') - 200), 'Dump::Malformed'],
        ['atoms without positions', 'ITEM: TIMESTEP\n0\nITEM: NUMBER OF ATOMS\n1\nITEM: BOX BOUNDS pp pp pp\n0 1\n0 1\n0 1\nITEM: ATOMS id type\n1 1\n', 'Dump::Malformed'],
        ['a general triclinic box', 'ITEM: TIMESTEP\n0\nITEM: NUMBER OF ATOMS\n1\nITEM: BOX BOUNDS abc origin pp pp pp\n1 0 0 0\n0 1 0 0\n0 0 1 0\nITEM: ATOMS id x y z\n1 0 0 0\n', 'Dump::Unsupported']
    ])('rejects %s', (_, text, code) => {
        expect(() => parseDump(text)).toThrow(expect.objectContaining({ code: expect.stringContaining(code) }));
    });
});
