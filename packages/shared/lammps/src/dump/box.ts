import type { FrameBox } from '@lammps-studio/contracts/run/frame';
import { DumpErrors } from '../shared/errors';
import { splitTokens } from '../shared/text';

export type Vector3 = [number, number, number];

export interface BoxGeometry{
    low: Vector3;
    high: Vector3;
    tilt: Vector3;
    bounds: FrameBox;
}

const TILT_FLAGS = ['xy', 'xz', 'yz'];
const GENERAL_TRICLINIC = 'abc';

const numbersOf = (line: string, count: number): number[] => {
    const values = splitTokens(line).slice(0, count).map(Number);
    if(values.length !== count || values.some(Number.isNaN)){
        throw DumpErrors.Malformed(`box line "${line}" needs ${count} numbers`);
    }

    return values;
};

const orthogonal = (lines: string[]): BoxGeometry => {
    const rows = lines.map((line) => numbersOf(line, 2));
    const low: Vector3 = [rows[0][0], rows[1][0], rows[2][0]];
    const high: Vector3 = [rows[0][1], rows[1][1], rows[2][1]];

    return {
        low,
        high,
        tilt: [0, 0, 0],
        bounds: { low, high }
    };
};

const triclinic = (lines: string[]): BoxGeometry => {
    const [[xloBound, xhiBound, xy], [yloBound, yhiBound, xz], [zlo, zhi, yz]] = lines.map((line) => numbersOf(line, 3));
    const low: Vector3 = [xloBound - Math.min(0, xy, xz, xy + xz), yloBound - Math.min(0, yz), zlo];
    const high: Vector3 = [xhiBound - Math.max(0, xy, xz, xy + xz), yhiBound - Math.max(0, yz), zhi];

    return {
        low,
        high,
        tilt: [xy, xz, yz],
        bounds: {
            low: [xloBound, yloBound, zlo],
            high: [xhiBound, yhiBound, zhi]
        }
    };
};

export const readBox = (item: string, lines: string[]): BoxGeometry => {
    const flags = splitTokens(item).slice(2);
    if(flags[0] === GENERAL_TRICLINIC){
        throw DumpErrors.Unsupported('general triclinic BOX BOUNDS abc origin');
    }

    return TILT_FLAGS.every((flag, index) => flags[index] === flag) ? triclinic(lines) : orthogonal(lines);
};
