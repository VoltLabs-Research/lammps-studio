import type { ThermoCompute } from '@/modules/variables/domain/variables';

const GROUP = 'all';
const SCOPE = 'Global';

export const THERMO_COMPUTES: ThermoCompute[] = [
    { id: 'thermo_temp', group: GROUP, style: 'temp', column: 'Temp' },
    { id: 'thermo_press', group: GROUP, style: 'pressure', column: 'Press' },
    { id: 'thermo_pe', group: GROUP, style: 'pe', column: 'PotEng' }
];

export const thermoComputeNote = (compute: ThermoCompute, thermoColumns: string[]): string => {
    if(!thermoColumns.includes(compute.column)) return SCOPE;

    return `${SCOPE} · thermo ${compute.column}`;
};
