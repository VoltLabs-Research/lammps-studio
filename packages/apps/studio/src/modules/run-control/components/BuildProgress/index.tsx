import { Run } from '@lammps-studio/contracts/run/domain';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import BuildStepRow from '@/modules/run-control/components/BuildStepRow';
import { useMachine, useRunBuild } from '@/modules/run-control/hooks/use-workspace';
import { buildProgressOf } from '@/modules/run-control/utils/build-progress';
import Icon from '@/shared/components/Icon';
import { useNow } from '@/shared/hooks/use-now';
import '@/modules/run-control/components/BuildProgress/build-progress.css';

interface BuildProgressProps{
    run: Run;
}

const PERCENT = 100;

const BuildProgress = ({ run }: BuildProgressProps) => {
    const build = useRunBuild(run);
    const machine = useMachine(run.config.machineId);
    const now = useNow();
    const [details, setDetails] = useState(false);

    const model = buildProgressOf(build, build?.packages ?? run.config.packages, machine?.name ?? run.config.machineId, now);
    const percent = model.progress * PERCENT;

    return (
        <div className='build'>
            <h3 className='build__title'>Building LAMMPS</h3>
            <p className='build__sub'>{model.sub}</p>
            <div className='build__bar' role='progressbar' aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={PERCENT} aria-label='Build progress'>
                <i style={{ width: `${percent.toFixed(1)}%` }} />
            </div>
            <p className='build__now num'>{model.now}</p>
            <button type='button' className='build__toggle' aria-expanded={details} onClick={() => setDetails(!details)}>
                {details ? 'Hide details' : 'Show details'}
                <Icon glyph={details ? ChevronUp : ChevronDown} size='xs' />
            </button>
            {details
                ? (
                    <div className='build__details'>
                        {model.steps.map((line) => <BuildStepRow key={line.name} line={line} />)}
                        {model.output ? <div className='build__out mono'>{model.output}</div> : null}
                    </div>
                )
                : null}
        </div>
    );
};

export default BuildProgress;
