import type { ThermoSection } from '@lammps-studio/contracts/run/domain';
import { Download } from 'lucide-react';
import type { ExportOption, ThermoFormat } from '@/modules/charts/domain/export';
import { chartPng } from '@/modules/charts/utils/chart-png';
import { chartedSection } from '@/modules/charts/utils/charts-panel';
import { thermoFileName, thermoText } from '@/modules/charts/utils/thermo-export';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Menu from '@/shared/components/Menu';
import { MenuEntry } from '@/shared/contracts/menu';
import { useMenu } from '@/shared/hooks/use-menu';
import { saveBlob } from '@/shared/services/save-file';
import { toast } from '@/shared/store/toast';

interface ChartsExportProps{
    sections: ThermoSection[];
    runNumber: number | null;
    featuredTile: () => HTMLElement | null;
}

const MENU_WIDTH = 180;
const TEXT_TYPE = 'text/plain';
const NO_CHART = 'There is no chart to save yet';

const OPTIONS: ExportOption[] = [
    { format: 'csv', label: 'CSV' },
    { format: 'dat', label: 'Gnuplot' },
    { format: 'yaml', label: 'YAML' },
    { format: 'png', label: 'PNG image' }
];

const ChartsExport = ({ sections, runNumber, featuredTile }: ChartsExportProps) => {
    const menu = useMenu();

    const save = async (format: ThermoFormat) => {
        const name = thermoFileName(runNumber, format);
        if(format !== 'png'){
            saveBlob(new Blob([thermoText(format, sections)], { type: TEXT_TYPE }), name);
            return;
        }

        const tile = featuredTile();
        if(!tile){
            toast(NO_CHART);
            return;
        }

        saveBlob(await chartPng(tile), name);
    };

    const entries: MenuEntry[] = OPTIONS.map((option) => ({
        id: option.format,
        label: option.label,
        hint: `.${option.format}`,
        disabled: chartedSection(sections) === null,
        run: () => void save(option.format)
    }));

    return (
        <>
            <Button
                size='sm'
                aria-haspopup='menu'
                aria-expanded={menu.anchor !== null}
                onClick={(event) => menu.toggle(event.currentTarget)}
            >
                <Icon glyph={Download} size='xs' />
                Export
            </Button>
            <Menu menu={menu} entries={entries} width={MENU_WIDTH} />
        </>
    );
};

export default ChartsExport;
