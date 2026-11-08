import type { ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { BentoSeries, StressStrainColumns, UnitStyle } from '@/modules/charts/domain/chart';
import { thermoQuantity } from '@/modules/charts/utils/thermo-quantity';

export const STRESS_STRAIN_KEY = 'stress-strain';
export const STEP_COLUMN = 'Step';

const STRAIN_COLUMN = /^[vc]_\w*(strain|eps)\w*$/i;
const STRESS_COLUMN = /^[vc]_\w*(stress|sigma|sig)\w*$/i;

export const findStressStrain = (columns: string[]): StressStrainColumns | null => {
    const strain = columns.find((column) => STRAIN_COLUMN.test(column));
    const stress = columns.find((column) => STRESS_COLUMN.test(column));

    if(!strain || !stress){
        return null;
    }

    return {
        strain,
        stress
    };
};

const columnValues = (section: ThermoSection, column: string): number[] => {
    const index = section.columns.indexOf(column);

    return section.rows.map((row) => row[index]);
};

export const sectionSteps = (section: ThermoSection): number[] => {
    if(!section.columns.includes(STEP_COLUMN)){
        return section.rows.map((_, index) => index);
    }

    return columnValues(section, STEP_COLUMN);
};

export const bentoSeries = (section: ThermoSection, units: UnitStyle): BentoSeries[] => {
    const steps = sectionSteps(section);
    const pair = findStressStrain(section.columns);
    const series: BentoSeries[] = [];

    if(pair){
        const stress = thermoQuantity(pair.stress, units);

        series.push({
            key: STRESS_STRAIN_KEY,
            label: 'Stress–strain',
            unit: stress.unit,
            axis: 'strain',
            xs: columnValues(section, pair.strain),
            ys: columnValues(section, pair.stress)
        });
    }

    for(const column of section.columns){
        if(column === STEP_COLUMN || column === pair?.strain){
            continue;
        }

        const quantity = thermoQuantity(column, units);

        series.push({
            key: column,
            label: quantity.label,
            unit: quantity.unit,
            axis: 'step',
            xs: steps,
            ys: columnValues(section, column)
        });
    }

    return series;
};
