import type { ThermoSection } from '@lammps-studio/contracts/run/domain';
import type { ThermoFormat } from '@/modules/charts/domain/export';

const SECTION_COLUMN = 'Section';

const unionColumns = (sections: ThermoSection[]): string[] => {
    const columns: string[] = [];
    for(const section of sections){
        for(const column of section.columns){
            if(!columns.includes(column)) columns.push(column);
        }
    }

    return columns;
};

const csvRows = (section: ThermoSection, columns: string[], prefix: string[]): string[] => {
    const positions = columns.map((column) => section.columns.indexOf(column));

    return section.rows.map((row) => [...prefix, ...positions.map((at) => (at < 0 ? '' : String(row[at])))].join(','));
};

export const thermoCsv = (sections: ThermoSection[]): string => {
    const columns = unionColumns(sections);
    const several = sections.length > 1;
    const head = several ? [SECTION_COLUMN, ...columns] : columns;
    const rows = sections.flatMap((section, index) => csvRows(section, columns, several ? [String(index + 1)] : []));

    return `${[head.join(','), ...rows].join('\n')}\n`;
};

const gnuplotBlock = (section: ThermoSection): string => {
    return [`# ${section.columns.join(' ')}`, ...section.rows.map((row) => row.join(' '))].join('\n');
};

export const thermoGnuplot = (sections: ThermoSection[]): string => `${sections.map(gnuplotBlock).join('\n\n\n')}\n`;

const yamlDocument = (section: ThermoSection): string => {
    const keywords = section.columns.map((column) => `'${column}'`).join(', ');
    const rows = section.rows.map((row) => `  - [${row.join(', ')}]`);

    return ['---', `keywords: [${keywords}]`, 'data:', ...rows, '...'].join('\n');
};

export const thermoYaml = (sections: ThermoSection[]): string => `${sections.map(yamlDocument).join('\n')}\n`;

const WRITERS: Record<Exclude<ThermoFormat, 'png'>, (sections: ThermoSection[]) => string> = {
    csv: thermoCsv,
    dat: thermoGnuplot,
    yaml: thermoYaml
};

export const thermoText = (format: Exclude<ThermoFormat, 'png'>, sections: ThermoSection[]): string => WRITERS[format](sections);

export const thermoFileName = (runNumber: number | null, format: ThermoFormat): string => {
    if(runNumber === null) return `thermo.${format}`;

    return `thermo-run${runNumber}.${format}`;
};
