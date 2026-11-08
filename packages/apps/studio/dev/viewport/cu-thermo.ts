import type { ThermoSection } from '@lammps-studio/contracts/run/domain';
import { E_MOD, EPS_Y, ERATE, gauss2, KB, L0, R_WIRE, smoothstep, STEPS_EQ, stressAt, THERMO_EVERY, WIRE } from '@dev/cu-model';

const COLS_EQ = ['Step', 'Temp', 'PotEng', 'KinEng', 'TotEng', 'Press'];
const COLS_RUN = ['Step', 'Temp', 'PotEng', 'KinEng', 'TotEng', 'Press', 'Lz', 'v_strain', 'v_stress'];

const tensionRow = (step: number): number[] => {
    const count = WIRE.count;
    const eps = step * ERATE;
    const k = Math.round(step / THERMO_EVERY);
    const sigma = step === 0 ? 0 : stressAt(eps, step);
    const d = eps - EPS_Y;
    const phase = d > 0 ? (d / 0.011) % 1 : 0;
    const fracture = smoothstep(0.40, 0.455, eps);
    const temperature = step === 0
        ? 300.41
        : 300 + 2.3 * gauss2(k, 5) + 24 * Math.exp(-Math.pow((eps - EPS_Y - 0.0025) / 0.004, 2)) + (d > 0 ? 3.5 * (1 - phase) * (1 - fracture) : 0) + 30 * Math.exp(-Math.pow((eps - 0.452) / 0.006, 2));
    const kinetic = 1.5 * count * KB * temperature;
    const volume = Math.PI * R_WIRE * R_WIRE * L0;
    const elastic = ((volume * sigma * sigma) / (2 * E_MOD)) * 0.00624;
    const potential = WIRE.latticeEnergy + 1.5 * count * KB * 300 + elastic + 290 * Math.max(0, d) + 140 * fracture + 6 * gauss2(k, 7);
    const pressure = ((-sigma * 1e4) / 3) * 0.785 + 38 * gauss2(k, 9);

    return [step, temperature, potential, kinetic, potential + kinetic, pressure, L0 * (1 + eps), eps, sigma];
};

const equilibrationRow = (step: number): number[] => {
    const count = WIRE.count;
    const k = Math.round(step / THERMO_EVERY);
    const temperature = step === 0 ? 300 : 300 - 148 * Math.exp(-(step - 1000) / 1100) + 2.4 * gauss2(k, 11);
    const heat = step === 0 ? 0 : 300 * (1 - Math.exp(-step / 260)) + 2 * gauss2(k, 13);
    const kinetic = 1.5 * count * KB * temperature;
    const potential = WIRE.latticeEnergy + 1.5 * count * KB * heat;
    const pressure = 1850 * Math.exp(-step / 1400) - 64 + 42 * gauss2(k, 15);

    return [step, temperature, potential, kinetic, potential + kinetic, pressure];
};

const rowsUpTo = (last: number, row: (step: number) => number[]): number[][] => {
    const rows: number[][] = [];

    for(let step = 0; step <= last; step += THERMO_EVERY){
        rows.push(row(step));
    }

    return rows;
};

export const cuThermo = (step: number): ThermoSection[] => {
    return [
        { section: 1, columns: COLS_EQ, rows: rowsUpTo(STEPS_EQ, equilibrationRow) },
        { section: 2, columns: COLS_RUN, rows: rowsUpTo(step, tensionRow) }
    ];
};
