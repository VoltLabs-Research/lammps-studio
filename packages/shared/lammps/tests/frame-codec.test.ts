import { describe, expect, it } from 'vitest';
import { FRAME_MAGIC } from '@lammps-studio/contracts/run/frame';
import custom from './fixtures/custom.lammpstrj?raw';
import { parseDump } from '../src/dump/parse-dump';
import { decodeFrame, encodeFrame } from '../src/dump/frame-codec';
import { decimateFrame } from '../src/dump/decimate-frame';

const positionOf = (positions: Float32Array, atom: number): number[] => [...positions.subarray(atom * 3, atom * 3 + 3)];

describe('the frame wire format', () => {
    const frame = parseDump(custom)[2];

    it('round-trips a frame exactly', () => {
        const decoded = decodeFrame(encodeFrame(frame));

        expect(decoded.header).toEqual(frame.header);
        expect(decoded.positions).toEqual(frame.positions);
        expect(Object.keys(decoded.columns)).toEqual(frame.header.columns);
        frame.header.columns.forEach((name) => expect(decoded.columns[name]).toEqual(frame.columns[name]));
    });

    it('lays out magic, padded JSON header, positions, then one block per column, little endian', () => {
        const buffer = encodeFrame(frame);
        const view = new DataView(buffer);
        const headerBytes = view.getUint32(4, true);
        const header = new TextDecoder().decode(new Uint8Array(buffer, 8, headerBytes));
        const body = 8 + headerBytes;
        const atoms = frame.header.atoms;

        expect(view.getUint32(0, true)).toBe(FRAME_MAGIC);
        expect(headerBytes % 4).toBe(0);
        expect(JSON.parse(header)).toEqual(frame.header);
        expect(header.trimEnd()).toBe(JSON.stringify(frame.header));
        expect(buffer.byteLength).toBe(body + atoms * (3 + 4) * 4);
        expect(view.getFloat32(body + 4 * 3, true)).toBe(frame.positions[3]);
        expect(view.getFloat32(body + atoms * 3 * 4, true)).toBe(frame.columns.type[0]);
        expect(view.getFloat32(body + atoms * (3 + 3) * 4, true)).toBe(frame.columns.v_speed[0]);
    });

    it.each([
        ['a wrong magic number', (buffer: ArrayBuffer) => new DataView(buffer).setUint32(0, 0xdeadbeef, true), 'Frame::BadMagic'],
        ['a header length that is not a multiple of 4', (buffer: ArrayBuffer) => new DataView(buffer).setUint32(4, 3, true), 'Frame::BadHeader']
    ])('rejects %s', (_, corrupt, code) => {
        const buffer = encodeFrame(frame);
        corrupt(buffer);

        expect(() => decodeFrame(buffer)).toThrow(expect.objectContaining({ code: expect.stringContaining(code) }));
    });

    it('rejects a buffer with missing atom data', () => {
        const buffer = encodeFrame(frame).slice(0, -4);

        expect(() => decodeFrame(buffer)).toThrow(expect.objectContaining({ code: expect.stringContaining('Frame::Truncated') }));
    });
});

describe('decimateFrame', () => {
    const frame = parseDump(custom)[0];

    it('keeps every nth atom with all of its columns', () => {
        const preview = decimateFrame(frame, 40);

        expect(preview.header.atoms).toBe(36);
        expect(preview.positions).toHaveLength(36 * 3);
        expect(positionOf(preview.positions, 1)).toEqual(positionOf(frame.positions, 3));
        expect(preview.columns.c_pe[1]).toBe(frame.columns.c_pe[3]);
        expect(preview.header.box).toEqual(frame.header.box);
    });

    it('returns the frame untouched when it is already small enough', () => {
        expect(decimateFrame(frame, 108)).toBe(frame);
    });

    it('produces a frame the wire format accepts', () => {
        const preview = decimateFrame(frame, 10);

        expect(decodeFrame(encodeFrame(preview)).header.atoms).toBe(preview.header.atoms);
        expect(preview.header.atoms).toBeLessThanOrEqual(10);
    });
});
