import { useLatestRun, useMachine, useOpenSimulation, useRunBuild } from '@/modules/run-control/hooks/use-workspace';
import { runChipOf } from '@/modules/run-control/utils/run-chip';
import { useNow } from '@/shared/hooks/use-now';
import { useWorkspaceStore } from '@/shared/store/workspace';
import { classNames } from '@/shared/utils/class-names';
import '@/modules/run-control/components/RunChip/run-chip.css';

const RunChip = () => {
    const simulation = useOpenSimulation();
    const run = useLatestRun();
    const build = useRunBuild(run);
    const machine = useMachine(run?.config.machineId ?? simulation?.machineId ?? null);
    const openPanel = useWorkspaceStore((state) => state.openPanel);
    const now = useNow();

    const chip = runChipOf(simulation, run, { build, machineName: machine?.name ?? '', now });
    if(!chip) return null;

    return (
        <button
            type='button'
            className={classNames('run-chip', chip.tone !== 'neutral' && chip.tone)}
            data-tip={chip.jump === 'editor' ? 'Open the editor' : 'Show output'}
            onClick={() => openPanel(chip.jump)}
        >
            <span className='run-chip__label'>{chip.label}</span>
            {chip.meta ? <span className='run-chip__meta'>{chip.meta}</span> : null}
        </button>
    );
};

export default RunChip;
