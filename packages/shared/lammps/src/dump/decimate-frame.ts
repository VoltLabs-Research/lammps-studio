import type { Frame } from '@lammps-studio/contracts/run/frame';

const AXES = 3;

export const decimateFrame = (frame: Frame, maxAtoms: number): Frame => {
    const { atoms, columns: names } = frame.header;
    if(atoms <= maxAtoms){
        return frame;
    }

    const stride = Math.ceil(atoms / maxAtoms);
    const kept = Math.ceil(atoms / stride);
    const positions = new Float32Array(kept * AXES);
    const columns = Object.fromEntries(names.map((name) => [name, new Float32Array(kept)]));

    for(let source = 0, target = 0; source < atoms; source += stride, target++){
        positions.set(frame.positions.subarray(source * AXES, source * AXES + AXES), target * AXES);
        names.forEach((name) => {
            columns[name][target] = frame.columns[name][source];
        });
    }

    return {
        header: {
            ...frame.header,
            atoms: kept
        },
        positions,
        columns
    };
};
