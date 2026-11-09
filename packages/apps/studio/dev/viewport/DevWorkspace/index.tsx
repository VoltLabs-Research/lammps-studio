import { useMemo, useRef, useState } from 'react';
import { Axis3d, Box, Camera, ChevronLeft, ChevronRight, Download, Film, Maximize2, Palette, Play, Scan, SkipBack, SkipForward } from 'lucide-react';
import type { FrameInfo } from '@lammps-studio/contracts/run/domain';
import type { PlotMode } from '@/modules/charts/domain/chart';
import type { AtomViewportHandle } from '@/modules/viewport/domain/components';
import type { ColorMode } from '@/modules/viewport/domain/scene';
import ChartsBento from '@/modules/charts/components/ChartsBento';
import AtomViewport from '@/modules/viewport/components/AtomViewport';
import FrameRuler from '@/modules/viewport/components/FrameRuler';
import ViewportBar from '@/modules/viewport/components/ViewportBar';
import { legendFor } from '@/modules/viewport/utils/legend-for';
import { currentTheme } from '@/modules/viewport/utils/theme-tokens';
import { DUMP_EVERY, EPS_Y, ERATE, STEPS_RUN } from '../../cu/cu-model';
import { cuFrame } from '../../cu/cu-frame';
import { cuThermo } from '../../cu/cu-thermo';

const params = new URLSearchParams(location.search);
const SHOWN_STEP = Number(params.get('step') ?? 192000);
const THERMO_STEP = SHOWN_STEP + 1000;
const MODES: ColorMode[] = ['structure', 'energy', 'type'];
const PLOT_MODES: PlotMode[] = ['raw', 'smooth', 'both'];
const FRAMES: FrameInfo[] = Array.from({ length: SHOWN_STEP / DUMP_EVERY + 1 }, (_, index) => ({ index, step: index * DUMP_EVERY, atoms: 0 }));
const SECTIONS = cuThermo(THERMO_STEP);

const DevWorkspace = () => {
    const [frameIndex, setFrameIndex] = useState(FRAMES.length - 1);
    const [colorMode, setColorMode] = useState<ColorMode>(MODES.find((mode) => mode === params.get('mode')) ?? 'structure');
    const [plotMode, setPlotMode] = useState<PlotMode>('both');
    const [featured, setFeatured] = useState<string | null>(params.get('featured'));
    const [showBox, setShowBox] = useState(true);
    const [showAxes, setShowAxes] = useState(true);
    const [barHeight, setBarHeight] = useState(0);
    const viewport = useRef<AtomViewportHandle>(null);
    const step = FRAMES[frameIndex].step;
    const frame = useMemo(() => cuFrame(step), [step]);
    const row = SECTIONS[1].rows.find((entry) => entry[0] === step) ?? SECTIONS[1].rows[0];

    const save = async () => {
        const blob = await viewport.current?.snapshot();

        if(blob){
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `cu-nanowire-step-${step}.png`;
            link.click();
        }
    };

    return (
        <>
            <div className='mockbar'><span className='mockbar__tag'>Dev</span><span>Viewport and charts</span></div>
            <div className='window'>
                <div className='view'>
                    <div className='ws'>
                        <header className='ws-top'>
                            <span className='ws-title'>Cu nanowire tension</span>
                            <div className='ws-top__center'>Running<span>38% · ETA 8 min</span></div>
                            <span />
                        </header>
                        <div className='ws-body'>
                            <nav className='activity' aria-label='Panels' />
                            <section className='panel' aria-label='Panel'>
                                <div className='panel__head'>
                                    <span className='panel__title'>Charts</span>
                                    <span className='panel__sub'>Thermo · {SECTIONS[1].rows.length} rows · live</span>
                                    <div className='panel__actions'>
                                        <div className='seg'>
                                            {PLOT_MODES.map((mode) => (
                                                <button key={mode} type='button' aria-pressed={plotMode === mode} onClick={() => setPlotMode(mode)}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</button>
                                            ))}
                                        </div>
                                        <button type='button' className='btn'><Download aria-hidden='true' />Export</button>
                                    </div>
                                </div>
                                <div className='panel__body'>
                                    <ChartsBento sections={SECTIONS} units='metal' plotMode={plotMode} totalSteps={STEPS_RUN} featured={featured} onFeature={setFeatured} />
                                </div>
                            </section>
                            <div className='resize' />
                            <section className='viewport' aria-label='Last computed timestep'>
                                <AtomViewport ref={viewport} frame={frame} colorMode={colorMode} showBox={showBox} showAxes={showAxes} atomScale={1} bottomInset={barHeight}>
                                    <div className='vp-rail glass'>
                                        <button type='button' className='icon-btn' aria-label='Colour mode' onClick={() => setColorMode(MODES[(MODES.indexOf(colorMode) + 1) % MODES.length])}><Palette aria-hidden='true' /></button>
                                        <button type='button' className='icon-btn' aria-label='Toggle simulation box' aria-pressed={showBox} onClick={() => setShowBox(!showBox)}><Box aria-hidden='true' /></button>
                                        <button type='button' className='icon-btn' aria-label='Toggle axes' aria-pressed={showAxes} onClick={() => setShowAxes(!showAxes)}><Axis3d aria-hidden='true' /></button>
                                        <button type='button' className='icon-btn' aria-label='Reset view' onClick={() => viewport.current?.resetView()}><Scan aria-hidden='true' /></button>
                                        <button type='button' className='icon-btn' aria-label='Save image' onClick={() => { void save(); }}><Camera aria-hidden='true' /></button>
                                        <button type='button' className='icon-btn' aria-label='Hide panel'><Maximize2 aria-hidden='true' /></button>
                                    </div>
                                </AtomViewport>
                                <ViewportBar
                                    step={`Step ${step.toLocaleString('en-US')}`}
                                    meta={`${(step * 0.001).toFixed(1)} ps · ε ${row[7].toFixed(3)} · σ ${row[8].toFixed(2)} GPa`}
                                    legend={legendFor(frame, colorMode, 'metal', currentTheme())}
                                    onHeight={setBarHeight}
                                >
                                    <button type='button' className='icon-btn sm' aria-label='First frame' onClick={() => setFrameIndex(0)}><SkipBack aria-hidden='true' /></button>
                                    <button type='button' className='icon-btn sm' aria-label='Previous frame' onClick={() => setFrameIndex(Math.max(0, frameIndex - 1))}><ChevronLeft aria-hidden='true' /></button>
                                    <button type='button' className='icon-btn sm' aria-label='Play frames'><Play aria-hidden='true' /></button>
                                    <button type='button' className='icon-btn sm' aria-label='Next frame' onClick={() => setFrameIndex(Math.min(FRAMES.length - 1, frameIndex + 1))}><ChevronRight aria-hidden='true' /></button>
                                    <button type='button' className='icon-btn sm' aria-label='Last frame' onClick={() => setFrameIndex(FRAMES.length - 1)}><SkipForward aria-hidden='true' /></button>
                                    <FrameRuler frames={FRAMES} index={frameIndex} startStep={0} endStep={STEPS_RUN} marker={EPS_Y / ERATE} onSeek={setFrameIndex} />
                                    <button type='button' className='icon-btn sm' aria-label='Export movie'><Film aria-hidden='true' /></button>
                                    <button type='button' className='live-btn' aria-pressed='true'><span className='dot' />Live</button>
                                </ViewportBar>
                            </section>
                        </div>
                        <footer className='statusbar'>This computer</footer>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DevWorkspace;
