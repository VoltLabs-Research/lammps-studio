import type { Frame } from '@lammps-studio/contracts/run/frame';
import { DUMP_EVERY, E_MOD, EPS_Y, ERATE, hash2, L0, lerp, normalCdf, normalPdf, R_WIRE, smoothstep, stressAt, WIRE, Z_NECK } from '@dev/cu-model';

const CNA_CODES = [1, 2, 3, 0];

export const cuFrame = (step: number): Frame => {
    const count = WIRE.count;
    const eps = step * ERATE;
    const sigma = step === 0 ? 0 : Math.max(0, stressAt(eps, step));
    const yielded = eps > EPS_Y;
    const elastic = yielded ? sigma / E_MOD : eps;
    const plastic = Math.max(0, eps - elastic);
    const width = Math.max(4, 11 - 14 * plastic);
    const pull = plastic * L0;
    const fracture = smoothstep(0.40, 0.455, eps);
    const frame = Math.round(step / DUMP_EVERY);
    const active = WIRE.faults.filter((fault) => eps > fault.opens && eps < fault.heals);
    const positions = new Float32Array(count * 3);
    const cna = new Float32Array(count);
    const energy = new Float32Array(count);
    const types = new Float32Array(count).fill(1);
    let maxX = 0;
    let maxY = 0;

    for(let i = 0; i < count; i++){
        const x0 = WIRE.x[i];
        const y0 = WIRE.y[i];
        const z0 = WIRE.z[i];
        const s = (z0 - Z_NECK) / width;
        const neck = Math.abs(z0 - Z_NECK);
        const share = fracture > 0 ? lerp(normalCdf(s), s > 0 ? 1 : 0, fracture) : normalCdf(s);
        const stretch = (1 + elastic) + (pull * normalPdf(s)) / width;
        const shrink = Math.sqrt((1 + elastic) / stretch) * (1 - 0.35 * elastic);
        const radial = fracture > 0 ? lerp(shrink, Math.min(1, 0.12 + Math.pow(neck / 16, 0.9)), fracture) : shrink;

        positions[i * 3] = x0 * radial + (hash2(i * 3, frame) - 0.5) * 0.24;
        positions[i * 3 + 1] = y0 * radial + (hash2(i * 3 + 1, frame) - 0.5) * 0.24;
        positions[i * 3 + 2] = z0 * (1 + elastic) + pull * (share - 0.5) + (hash2(i * 3 + 2, frame) - 0.5) * 0.24;
        maxX = Math.max(maxX, Math.abs(positions[i * 3]));
        maxY = Math.max(maxY, Math.abs(positions[i * 3 + 1]));

        const gauss = Math.exp(-0.5 * Math.pow((z0 - Z_NECK) / (1.6 * width), 2));
        const band = 1.9 + (yielded ? 5.5 * plastic * gauss : 0) + 6 * fracture * Math.exp(-neck / 9);
        let kind = 0;

        if(WIRE.radius[i] > R_WIRE - band){
            kind = 3;
        }else{
            for(const fault of active){
                const plane = WIRE.planes[i * 4 + fault.family];

                if(neck <= fault.zone && (plane === fault.plane || plane === fault.plane + 1)){
                    kind = 1;
                    break;
                }
            }
            if(kind === 0 && yielded && plastic > 0.09 && neck < width * 0.8 && hash2(i, 77) < 0.035){
                kind = 2;
            }
            if(kind === 0 && hash2(i, frame + 991) < 0.0035){
                kind = 3;
            }
        }

        let value = WIRE.energy[i];

        if(kind === 1){
            value += 0.018;
        }else if(kind === 2){
            value += 0.05;
        }else if(kind === 3 && !WIRE.surface[i]){
            value = -3.24 + 0.08 * (hash2(i, 5) - 0.5);
        }

        cna[i] = CNA_CODES[kind];
        energy[i] = value + 0.03 * (hash2(i, frame + 3) - 0.5) + 0.4 * elastic * elastic;
    }

    const lz = L0 * (1 + eps);

    return {
        header: {
            step,
            atoms: count,
            box: {
                low: [-(maxX + 0.6), -(maxY + 0.6), -lz / 2],
                high: [maxX + 0.6, maxY + 0.6, lz / 2]
            },
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
