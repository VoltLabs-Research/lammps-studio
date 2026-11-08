import type { Frame } from '@lammps-studio/contracts/run/frame';
import { hash2 } from '@dev/cu-model';

const BASIS = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
const LATTICE = 3.615;
const JITTER = 0.2;

export const bigFrame = (cells: number, seed: number): Frame => {
    const count = cells * cells * cells * BASIS.length;
    const positions = new Float32Array(count * 3);
    const cna = new Float32Array(count);
    const energy = new Float32Array(count);
    const types = new Float32Array(count);
    const edge = cells * LATTICE;
    let atom = 0;

    for(let i = 0; i < cells; i++){
        for(let j = 0; j < cells; j++){
            for(let k = 0; k < cells; k++){
                for(const [a, b, c] of BASIS){
                    positions[atom * 3] = (i + a) * LATTICE + (hash2(atom * 3, seed) - 0.5) * JITTER;
                    positions[atom * 3 + 1] = (j + b) * LATTICE + (hash2(atom * 3 + 1, seed) - 0.5) * JITTER;
                    positions[atom * 3 + 2] = (k + c) * LATTICE + (hash2(atom * 3 + 2, seed) - 0.5) * JITTER;
                    cna[atom] = hash2(atom, 3) < 0.9 ? 1 : 2;
                    energy[atom] = -3.54 + 0.1 * hash2(atom, seed + 7);
                    types[atom] = 1 + (atom % 2);
                    atom++;
                }
            }
        }
    }

    return {
        header: {
            step: seed * 1000,
            atoms: count,
            box: { low: [0, 0, 0], high: [edge, edge, edge] },
            columns: ['type', 'c_pe', 'c_cna']
        },
        positions,
        columns: {
            type: types,
            c_pe: energy,
            c_cna: cna
        }
    };
};
