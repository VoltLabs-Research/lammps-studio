import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { UnitStyle } from '@lammps-studio/contracts/script/domain';
import type { Legend, LegendSwatch } from '@/modules/viewport/domain/legend';
import type { ColorMode, ThemeName } from '@/modules/viewport/domain/scene';
import { energyUnit } from '@/modules/charts/utils/thermo-quantity';
import { ENERGY_COLUMN, resolveColorMode, STRUCTURE_COLUMN, STRUCTURE_NAMES, structureColors, structureOf, TYPE_COLUMN, typeColor, VIRIDIS } from '@/modules/viewport/utils/atom-palette';
import { columnRange } from '@/modules/viewport/utils/column-range';

const structureItems = (frame: Frame, theme: ThemeName): LegendSwatch[] => {
    const values = frame.columns[STRUCTURE_COLUMN];
    const counts = STRUCTURE_NAMES.map(() => 0);
    const colors = structureColors(theme);

    for(let atom = 0; atom < values.length; atom++){
        counts[structureOf(values[atom])]++;
    }

    return STRUCTURE_NAMES
        .map((name, index) => ({ name, color: colors[index], count: counts[index], share: counts[index] / frame.header.atoms }))
        .filter((item) => item.count > 0);
};

const typeItems = (frame: Frame): LegendSwatch[] => {
    const counts = new Map<number, number>();

    if(!frame.header.columns.includes(TYPE_COLUMN)){
        counts.set(1, frame.header.atoms);
    }else{
        for(const value of frame.columns[TYPE_COLUMN]){
            const type = Math.round(value);
            counts.set(type, (counts.get(type) ?? 0) + 1);
        }
    }

    return [...counts.entries()]
        .sort(([a], [b]) => a - b)
        .map(([type, count]) => ({ name: String(type), color: typeColor(type), count, share: count / frame.header.atoms }));
};

export const legendFor = (frame: Frame, mode: ColorMode, units: UnitStyle, theme: ThemeName): Legend => {
    const resolved = resolveColorMode(frame.header, mode);

    if(resolved === 'structure'){
        return {
            kind: 'structure',
            items: structureItems(frame, theme)
        };
    }
    if(resolved === 'energy'){
        const { min, max } = columnRange(frame.columns[ENERGY_COLUMN]);

        return {
            kind: 'energy',
            stops: VIRIDIS,
            min,
            max,
            unit: energyUnit(units)
        };
    }

    return {
        kind: 'type',
        items: typeItems(frame)
    };
};
