export const A_CU = 3.615;
export const R_WIRE = 21.5;
export const NCELL_Z = 40;
export const L0 = A_CU * NCELL_Z;
export const Z_NECK = 0.08 * L0;
export const STEPS_EQ = 20000;
export const STEPS_RUN = 500000;
export const THERMO_EVERY = 1000;
export const DUMP_EVERY = 2000;
export const RESTART_EVERY = 50000;
export const ERATE = 1e-6;
export const EPS_Y = 0.075;
export const SIG_Y = 4.62;
export const E_MOD = 85;
export const KB = 8.617333262e-5;
export const TPS = 640.82;

const FCC_BASIS = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
const FAULT_FAMILIES = [[1, 1, 1], [1, 1, -1], [1, -1, 1], [-1, 1, 1]];

export interface Fault{
    family: number;
    plane: number;
    opens: number;
    heals: number;
    zone: number;
}

export interface Wire{
    count: number;
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    planes: Int16Array;
    radius: Float32Array;
    surface: Uint8Array;
    energy: Float32Array;
    latticeEnergy: number;
    faults: Fault[];
}

export const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (a: number, b: number, x: number): number => {
    const t = clamp((x - a) / (b - a), 0, 1);

    return t * t * (3 - 2 * t);
};

export const hash32 = (seed: number): number => {
    let x = (seed | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    x ^= x >>> 16;

    return (x >>> 0) / 4294967296;
};

export const hash2 = (a: number, b: number): number => hash32(Math.imul(a | 0, 73856093) ^ Math.imul((b | 0) + 1, 19349663));

export const gauss2 = (a: number, b: number): number => {
    const u = Math.max(1e-9, hash2(a, b));
    const v = hash2(a + 7919, b + 104729);

    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export const mulberry32 = (start: number) => {
    let seed = start;

    return (): number => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const erf = (value: number): number => {
    const sign = Math.sign(value);
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);

    return sign * y;
};

export const normalCdf = (s: number): number => 0.5 * (1 + erf(s / Math.SQRT2));
export const normalPdf = (s: number): number => Math.exp(-0.5 * s * s) / Math.sqrt(2 * Math.PI);

const buildFaults = (): Fault[] => {
    const random = mulberry32(48213);

    return Array.from({ length: 14 }, (_, index) => {
        const family = index % 4;
        const shift = (random() - 0.5) * 30;

        return {
            family,
            plane: Math.round((FAULT_FAMILIES[family][2] * (Z_NECK + shift)) / A_CU),
            opens: EPS_Y + 0.0015 + index * 0.009 + random() * 0.004,
            heals: EPS_Y + 0.06 + index * 0.016 + random() * 0.05,
            zone: 18 + random() * 10
        };
    });
};

const buildWire = (): Wire => {
    const cells = Math.ceil(R_WIRE / A_CU) + 1;
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    const planes: number[] = [];

    for(let k = 0; k < NCELL_Z; k++){
        for(let j = -cells; j < cells; j++){
            for(let i = -cells; i < cells; i++){
                for(const [bx, by, bz] of FCC_BASIS){
                    const x = (i + bx) * A_CU;
                    const y = (j + by) * A_CU;
                    const z = (k + bz) * A_CU - L0 / 2;

                    if(x * x + y * y <= R_WIRE * R_WIRE){
                        xs.push(x);
                        ys.push(y);
                        zs.push(z);
                        planes.push(Math.round((x + y + z) / A_CU), Math.round((x + y - z) / A_CU), Math.round((x - y + z) / A_CU), Math.round((-x + y + z) / A_CU));
                    }
                }
            }
        }
    }

    const count = xs.length;
    const radius = new Float32Array(count);
    const surface = new Uint8Array(count);
    const energy = new Float32Array(count);
    let latticeEnergy = 0;

    for(let i = 0; i < count; i++){
        radius[i] = Math.hypot(xs[i], ys[i]);
        surface[i] = radius[i] > R_WIRE - 1.9 ? 1 : 0;
        energy[i] = surface[i] ? -3.07 + 0.05 * (hash2(i, 1) - 0.5) : -3.54 + 0.012 * (hash2(i, 2) - 0.5);
        latticeEnergy += energy[i];
    }

    return {
        count,
        x: Float32Array.from(xs),
        y: Float32Array.from(ys),
        z: Float32Array.from(zs),
        planes: Int16Array.from(planes),
        radius,
        surface,
        energy,
        latticeEnergy,
        faults: buildFaults()
    };
};

export const WIRE = buildWire();

export const stressAt = (eps: number, step: number): number => {
    let sigma: number;

    if(eps <= EPS_Y){
        const t = eps / EPS_Y;
        sigma = SIG_Y * t * (1.38 - 0.38 * t);
    }else{
        const d = eps - EPS_Y;
        const thin = smoothstep(0.26, 0.43, eps);
        const flow = 1.28 * (1 - 0.8 * thin);
        sigma = flow + (SIG_Y - flow) * Math.exp(-d / 0.0045);
        sigma += 0.34 * (0.5 - ((d / 0.011) % 1)) * (1 - thin) * smoothstep(0, 0.006, d);
    }

    sigma *= 1 - smoothstep(0.40, 0.455, eps);

    return sigma + 0.035 * gauss2(Math.round(step / THERMO_EVERY), 3);
};
