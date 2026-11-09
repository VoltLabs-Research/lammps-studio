import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { useLatestRun, useRunPhase } from '@/modules/run-control/hooks/use-workspace';
import BuildProgress from '@/modules/run-control/components/BuildProgress';
import EntryPicker from '@/modules/run-control/components/EntryPicker';
import NotRunYet from '@/modules/run-control/components/NotRunYet';
import StartingRun from '@/modules/run-control/components/StartingRun';
import { useEntryStore } from '@/modules/run-control/store/entry';
import { overlayOf } from '@/modules/run-control/utils/run-overlay';
import '@/modules/run-control/components/RunOverlay/run-overlay.css';

interface RunOverlayProps{
    simulation: Simulation;
}

const RunOverlay = ({ simulation }: RunOverlayProps) => {
    const phase = useRunPhase();
    const run = useLatestRun();
    const picking = useEntryStore((state) => state.pickingFor === simulation.id);

    const overlay = overlayOf(phase, picking);
    if(overlay === null) return null;

    return (
        <div className='vp-overlay'>
            {overlay === 'picker' ? <EntryPicker simulation={simulation} /> : null}
            {overlay === 'idle' ? <NotRunYet simulation={simulation} /> : null}
            {overlay === 'building' && run ? <BuildProgress run={run} /> : null}
            {overlay === 'starting' && run ? <StartingRun simulation={simulation} run={run} /> : null}
        </div>
    );
};

export default RunOverlay;
