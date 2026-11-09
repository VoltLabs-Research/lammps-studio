import { ReactNode, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import AtomViewport from '@/modules/viewport/components/AtomViewport';
import FrameTimeline from '@/modules/viewport/components/FrameTimeline';
import ToolRail from '@/modules/viewport/components/ToolRail';
import ViewportBar from '@/modules/viewport/components/ViewportBar';
import { useSceneTheme } from '@/modules/viewport/hooks/use-scene-theme';
import { frameFor, loadFrame, useFrameDataStore } from '@/modules/viewport/store/frame-data';
import { cursorOf, useViewportViewStore } from '@/modules/viewport/store/viewport-view';
import { isFollowing, shownPosition } from '@/modules/viewport/utils/frame-cursor';
import { barInfoOf, rulerSpanOf, yieldStepOf } from '@/modules/viewport/utils/frame-info';
import { legendFor } from '@/modules/viewport/utils/legend-for';
import { runKeyOf, spanOf } from '@/modules/viewport/utils/viewed-frames';
import { workspaceViewport } from '@/modules/viewport/utils/viewport-shot';
import { useRunSessionStore, viewedRun } from '@/shared/store/run-session';
import '@/modules/viewport/components/WorkspaceViewport/workspace-viewport.css';

interface WorkspaceViewportProps{
    banner: ReactNode;
    children: ReactNode;
}

const DEFAULT_UNITS = 'lj';
const NO_RUN = 'none';

const WorkspaceViewport = ({ banner, children }: WorkspaceViewportProps) => {
    const simulationId = useRunSessionStore((state) => state.simulationId);
    const runNumber = useRunSessionStore((state) => state.runNumber);
    const frames = useRunSessionStore((state) => state.frames);
    const thermo = useRunSessionStore((state) => state.thermo);
    const script = useRunSessionStore((state) => state.script);
    const run = useRunSessionStore(viewedRun);
    const runKey = useRunSessionStore(runKeyOf);
    const span = useRunSessionStore(useShallow(spanOf));
    const view = useViewportViewStore();
    const theme = useSceneTheme();
    const [barHeight, setBarHeight] = useState(0);

    const cursor = cursorOf(view, runKey);
    const position = shownPosition(cursor, span.count);
    const shown = frames[position] ?? null;
    const frame = useFrameDataStore((state) => frameFor(state, runKey));
    const units = script?.units ?? DEFAULT_UNITS;
    const following = isFollowing(cursor, span);

    useEffect(() => {
        if(simulationId === null || runNumber === null || shown === null) return;

        void loadFrame({ simulationId, runNumber, frame: shown });
    }, [simulationId, runNumber, shown]);

    const bar = barInfoOf({ frames, position, following, run, thermo });
    const legend = frame ? legendFor(frame, view.colorMode, units, theme) : null;

    return (
        <section className='viewport' aria-label='Last computed timestep'>
            {banner}
            <AtomViewport
                key={runKey ?? NO_RUN}
                ref={workspaceViewport}
                frame={frame}
                colorMode={view.colorMode}
                showBox={view.showBox}
                showAxes={view.showAxes}
                atomScale={view.atomScale}
                bottomInset={bar ? barHeight : 0}
            >
                <ToolRail frame={frame} legend={legend} script={script} units={units} />
                {children}
            </AtomViewport>
            {bar
                ? (
                    <ViewportBar step={bar.step} meta={bar.meta} legend={legend} onHeight={setBarHeight}>
                        {span.count > 0
                            ? (
                                <FrameTimeline
                                    frames={frames}
                                    position={position}
                                    span={span}
                                    following={following}
                                    ruler={rulerSpanOf(frames, run)}
                                    marker={yieldStepOf(thermo, units)}
                                    playing={view.playing}
                                />
                            )
                            : null}
                    </ViewportBar>
                )
                : null}
        </section>
    );
};

export default WorkspaceViewport;
