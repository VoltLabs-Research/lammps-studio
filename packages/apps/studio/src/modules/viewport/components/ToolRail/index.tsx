import type { Frame } from '@lammps-studio/contracts/run/frame';
import type { ScriptInfo, UnitStyle } from '@lammps-studio/contracts/script/domain';
import { Box, Camera, Maximize2, Move3d, Palette, Scan } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import DisplayPopover from '@/modules/viewport/components/DisplayPopover';
import type { Legend } from '@/modules/viewport/domain/legend';
import { setDisplay, useViewportViewStore } from '@/modules/viewport/store/viewport-view';
import { FALLBACK_RADIUS } from '@/modules/viewport/utils/estimate-atom-radius';
import { saveViewportImage, workspaceViewport } from '@/modules/viewport/utils/viewport-shot';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import { useWorkspaceStore } from '@/shared/store/workspace';
import '@/modules/viewport/components/ToolRail/tool-rail.css';

interface ToolRailProps{
    frame: Frame | null;
    legend: Legend | null;
    script: ScriptInfo | null;
    units: UnitStyle;
}

const ToolRail = ({ frame, legend, script, units }: ToolRailProps) => {
    const showBox = useViewportViewStore((state) => state.showBox);
    const showAxes = useViewportViewStore((state) => state.showAxes);
    const panelOpen = useWorkspaceStore((state) => state.panelOpen);
    const setPanelOpen = useWorkspaceStore((state) => state.setPanelOpen);
    const [displayRadius, setDisplayRadius] = useState<number | null>(null);
    const toolsRef = useRef<HTMLDivElement>(null);
    const displayOpen = displayRadius !== null;

    useEffect(() => {
        if(!displayOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            if(event.target instanceof Node && toolsRef.current?.contains(event.target)) return;
            setDisplayRadius(null);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if(event.key === 'Escape') setDisplayRadius(null);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [displayOpen]);

    const toggleDisplay = () => setDisplayRadius(displayOpen ? null : workspaceViewport.current?.atomRadius() ?? FALLBACK_RADIUS);
    const panelTip = panelOpen ? 'Hide panel' : 'Show panel';

    return (
        <div ref={toolsRef} className='vp-tools'>
            <div className='vp-rail glass'>
                <IconButton label='Display settings' tip='Display' tipSide='left' aria-expanded={displayOpen} onClick={toggleDisplay}>
                    <Icon glyph={Palette} />
                </IconButton>
                <IconButton label='Toggle simulation box' tip='Simulation box' tipSide='left' pressed={showBox} onClick={() => setDisplay({ showBox: !showBox })}>
                    <Icon glyph={Box} />
                </IconButton>
                <IconButton label='Toggle axes' tip='Axes' tipSide='left' pressed={showAxes} onClick={() => setDisplay({ showAxes: !showAxes })}>
                    <Icon glyph={Move3d} />
                </IconButton>
                <IconButton label='Reset view' tip='Reset view · double-click' tipSide='left' onClick={() => workspaceViewport.current?.resetView()}>
                    <Icon glyph={Scan} />
                </IconButton>
                <IconButton label='Save image' tip='Save image' tipSide='left' onClick={() => void saveViewportImage()}>
                    <Icon glyph={Camera} />
                </IconButton>
                <IconButton label={panelTip} tip={panelTip} tipSide='left' pressed={!panelOpen} onClick={() => setPanelOpen(!panelOpen)}>
                    <Icon glyph={Maximize2} />
                </IconButton>
            </div>
            {displayRadius === null ? null : <DisplayPopover frame={frame} legend={legend} script={script} units={units} baseRadius={displayRadius} />}
        </div>
    );
};

export default ToolRail;
