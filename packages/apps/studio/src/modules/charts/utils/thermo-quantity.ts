import type { UnitStyle } from '@lammps-studio/contracts/script/domain';
import type { ThermoQuantity } from '@/modules/charts/domain/chart';

type Dimension = 'temperature' | 'energy' | 'pressure' | 'length' | 'volume' | 'density' | 'time' | 'none';

interface Keyword{
    label: string;
    dimension: Dimension;
}

const KEYWORDS: Record<string, Keyword> = {
    Temp: { label: 'Temperature', dimension: 'temperature' },
    PotEng: { label: 'Potential energy', dimension: 'energy' },
    KinEng: { label: 'Kinetic energy', dimension: 'energy' },
    TotEng: { label: 'Total energy', dimension: 'energy' },
    Enthalpy: { label: 'Enthalpy', dimension: 'energy' },
    E_pair: { label: 'Pair energy', dimension: 'energy' },
    E_vdwl: { label: 'Van der Waals energy', dimension: 'energy' },
    E_coul: { label: 'Coulomb energy', dimension: 'energy' },
    E_long: { label: 'Long-range energy', dimension: 'energy' },
    E_bond: { label: 'Bond energy', dimension: 'energy' },
    E_angle: { label: 'Angle energy', dimension: 'energy' },
    E_dihed: { label: 'Dihedral energy', dimension: 'energy' },
    E_impro: { label: 'Improper energy', dimension: 'energy' },
    E_mol: { label: 'Molecular energy', dimension: 'energy' },
    E_tail: { label: 'Tail energy', dimension: 'energy' },
    Press: { label: 'Pressure', dimension: 'pressure' },
    Pxx: { label: 'Pressure xx', dimension: 'pressure' },
    Pyy: { label: 'Pressure yy', dimension: 'pressure' },
    Pzz: { label: 'Pressure zz', dimension: 'pressure' },
    Pxy: { label: 'Pressure xy', dimension: 'pressure' },
    Pxz: { label: 'Pressure xz', dimension: 'pressure' },
    Pyz: { label: 'Pressure yz', dimension: 'pressure' },
    Lx: { label: 'Box length Lx', dimension: 'length' },
    Ly: { label: 'Box length Ly', dimension: 'length' },
    Lz: { label: 'Box length Lz', dimension: 'length' },
    Volume: { label: 'Volume', dimension: 'volume' },
    Density: { label: 'Density', dimension: 'density' },
    Time: { label: 'Time', dimension: 'time' },
    Step: { label: 'Step', dimension: 'none' },
    Atoms: { label: 'Atoms', dimension: 'none' },
    CPU: { label: 'CPU time', dimension: 'none' },
    Fmax: { label: 'Max force', dimension: 'none' },
    Fnorm: { label: 'Force norm', dimension: 'none' }
};

type UnitTable = Record<Exclude<Dimension, 'none'>, string>;

const UNITS: Record<UnitStyle, UnitTable> = {
    metal: { temperature: 'K', energy: 'eV', pressure: 'bar', length: 'Å', volume: 'Å³', density: 'g/cm³', time: 'ps' },
    real: { temperature: 'K', energy: 'kcal/mol', pressure: 'atm', length: 'Å', volume: 'Å³', density: 'g/cm³', time: 'fs' },
    lj: { temperature: '', energy: '', pressure: '', length: '', volume: '', density: '', time: '' },
    si: { temperature: 'K', energy: 'J', pressure: 'Pa', length: 'm', volume: 'm³', density: 'kg/m³', time: 's' },
    cgs: { temperature: 'K', energy: 'erg', pressure: 'dyne/cm²', length: 'cm', volume: 'cm³', density: 'g/cm³', time: 's' },
    electron: { temperature: 'K', energy: 'Ha', pressure: 'Pa', length: 'Bohr', volume: 'Bohr³', density: 'amu/Bohr³', time: 'fs' },
    micro: { temperature: 'K', energy: 'pg·µm²/µs²', pressure: 'pg/(µm·µs²)', length: 'µm', volume: 'µm³', density: 'pg/µm³', time: 'µs' },
    nano: { temperature: 'K', energy: 'ag·nm²/ns²', pressure: 'ag/(nm·ns²)', length: 'nm', volume: 'nm³', density: 'ag/nm³', time: 'ns' }
};

export const thermoQuantity = (column: string, units: UnitStyle): ThermoQuantity => {
    const keyword = KEYWORDS[column];

    if(!keyword){
        return {
            label: column,
            unit: ''
        };
    }

    return {
        label: keyword.label,
        unit: keyword.dimension === 'none' ? '' : UNITS[units][keyword.dimension]
    };
};

export const energyUnit = (units: UnitStyle): string => {
    return UNITS[units].energy;
};
