import type { RunState } from '@lammps-studio/contracts/run/domain';
import { ChartLine } from 'lucide-react';
import { useRef } from 'react';
import type { PlotMode } from '@/modules/charts/domain/chart';
import ChartsBento from '@/modules/charts/components/ChartsBento';
import ChartsExport from '@/modules/charts/components/ChartsExport';
import { useChartsViewStore } from '@/modules/charts/store/charts-view';
import { chartedSection, chartEndStep, chartsSub } from '@/modules/charts/utils/charts-panel';
import PanelEmpty from '@/shared/components/PanelEmpty';
import PanelHead from '@/shared/components/PanelHead';
import Seg from '@/shared/components/Seg';
import { SegOption } from '@/shared/contracts/ui';
import { useRunSessionStore, viewedRun } from '@/shared/store/run-session';

const PLOT_MODES: SegOption<PlotMode>[] = [
    { value: 'raw', label: 'Raw' },
    { value: 'smooth', label: 'Smooth' },
    { value: 'both', label: 'Both' }
];

const LAMMPS_DEFAULT_UNITS = 'lj';
const ENDED: RunState[] = ['cancelled', 'completed', 'failed'];
const FEATURED_TILE = '.tile--feat';

const ChartsPanel = () => {
    const thermo = useRunSessionStore((state) => state.thermo);
    const script = useRunSessionStore((state) => state.script);
    const runNumber = useRunSessionStore((state) => state.runNumber);
    const run = useRunSessionStore(viewedRun);
    const { plotMode, featured, setPlotMode, setFeatured } = useChartsViewStore();
    const body = useRef<HTMLDivElement>(null);
    const charted = chartedSection(thermo) !== null;

    return (
        <>
            <PanelHead title='Charts' sub={chartsSub(thermo, run?.state === 'running')}>
                <Seg size='sm' label='Plot' options={PLOT_MODES} value={plotMode} onChange={setPlotMode} />
                <ChartsExport sections={thermo} runNumber={runNumber} featuredTile={() => body.current?.querySelector<HTMLElement>(FEATURED_TILE) ?? null} />
            </PanelHead>
            <div ref={body} className='panel__body'>
                {charted
                    ? (
                        <ChartsBento
                            sections={thermo}
                            units={script?.units ?? LAMMPS_DEFAULT_UNITS}
                            plotMode={plotMode}
                            totalSteps={chartEndStep(thermo, run, script)}
                            featured={featured}
                            onFeature={setFeatured}
                        />
                    )
                    : (
                        <PanelEmpty icon={ChartLine} title='No thermo data yet'>
                            <p>
                                {run && ENDED.includes(run.state)
                                    ? 'This simulation has not produced thermo output yet.'
                                    : 'Every column of thermo_style becomes a chart here as soon as LAMMPS prints the first thermo line.'}
                            </p>
                        </PanelEmpty>
                    )}
            </div>
        </>
    );
};

export default ChartsPanel;
