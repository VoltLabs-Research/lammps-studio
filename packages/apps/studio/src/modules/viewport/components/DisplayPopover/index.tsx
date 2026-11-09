import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { ScriptInfo, UnitStyle } from '@lammps-studio/contracts/script/domain';
import { Copy, Download } from 'lucide-react';
import { useId } from 'react';
import type { Legend } from '@/modules/viewport/domain/legend';
import type { ColorMode } from '@/modules/viewport/domain/scene';
import { setDisplay, useViewportViewStore } from '@/modules/viewport/store/viewport-view';
import { colorColumnOf, colorsFileName, colorsJson, dumpImageCommand, radiusText } from '@/modules/viewport/utils/display-exports';
import Icon from '@/shared/components/Icon';
import Seg from '@/shared/components/Seg';
import { SegOption } from '@/shared/contracts/ui';
import { copyText } from '@/shared/services/clipboard';
import { saveBlob } from '@/shared/services/save-file';
import { toast } from '@/shared/store/toast';
import '@/shared/components/Menu/menu.css';
import '@/shared/components/MenuItem/menu-item.css';
import '@/modules/viewport/components/DisplayPopover/display-popover.css';

interface DisplayPopoverProps{
    frame: Frame | null;
    legend: Legend | null;
    script: ScriptInfo | null;
    units: UnitStyle;
    baseRadius: number;
}

const MODES: SegOption<ColorMode>[] = [
    { value: 'structure', label: 'Structure' },
    { value: 'energy', label: 'Energy' },
    { value: 'type', label: 'Type' }
];

const MIN_SCALE = 0.4;
const MAX_SCALE = 1.6;
const SCALE_STEP = 0.05;
const JSON_TYPE = 'application/json';

const DisplayPopover = ({ frame, legend, script, units, baseRadius }: DisplayPopoverProps) => {
    const sizeId = useId();
    const colorMode = useViewportViewStore((state) => state.colorMode);
    const atomScale = useViewportViewStore((state) => state.atomScale);
    const column = colorColumnOf(frame, colorMode);

    const saveColors = () => {
        if(!legend) return;

        const name = colorsFileName(column);
        saveBlob(new Blob([colorsJson(legend)], { type: JSON_TYPE }), name);
        toast(`Saved colors as ${name}`);
    };

    return (
        <div className='display-pop glass' role='dialog' aria-label='Display'>
            <div className='menu-caption'>Color atoms by</div>
            <div className='display-pop__modes'>
                <Seg label='Color atoms by' size='sm' options={MODES} value={colorMode} onChange={(mode) => setDisplay({ colorMode: mode })} />
            </div>
            <div className='menu-caption'><label htmlFor={sizeId}>Atom radius</label></div>
            <div className='display-pop__size'>
                <input
                    id={sizeId}
                    type='range'
                    min={MIN_SCALE}
                    max={MAX_SCALE}
                    step={SCALE_STEP}
                    value={atomScale}
                    onChange={(event) => setDisplay({ atomScale: Number(event.target.value) })}
                />
                <span className='mono num display-pop__value'>{radiusText(baseRadius * atomScale, units)}</span>
            </div>
            <div className='menu-sep' />
            <button type='button' className='menu-item' onClick={() => void copyText(dumpImageCommand(script, column), 'Copied the dump image command')}>
                <Icon glyph={Copy} size='sm' />
                <span>Copy as dump image command</span>
            </button>
            <button type='button' className='menu-item' disabled={!legend} onClick={saveColors}>
                <Icon glyph={Download} size='sm' />
                <span>Save colors</span>
            </button>
        </div>
    );
};

export default DisplayPopover;
