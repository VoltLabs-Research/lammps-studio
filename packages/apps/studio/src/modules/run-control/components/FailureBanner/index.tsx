import { CircleAlert, X } from 'lucide-react';
import { useState } from 'react';
import { useLatestRun } from '@/modules/run-control/hooks/use-workspace';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import { useWorkspaceStore } from '@/shared/store/workspace';
import { formatInt } from '@/shared/utils/format';
import '@/modules/run-control/components/FailureBanner/failure-banner.css';

const FailureBanner = () => {
    const run = useLatestRun();
    const openPanel = useWorkspaceStore((state) => state.openPanel);
    const [dismissed, setDismissed] = useState<string | null>(null);

    const key = run ? `${run.simulationId}/${run.number}` : null;
    if(!run || run.state !== 'failed' || dismissed === key) return null;

    return (
        <div className='banner' role='alert'>
            <span className='banner__icon'><Icon glyph={CircleAlert} size='sm' /></span>
            <div className='banner__body'>
                <div className='banner__title'>Run {run.number} failed near step {formatInt(run.error?.step ?? run.progress.step)}</div>
                {run.error ? <div className='banner__msg'>{run.error.message}</div> : null}
            </div>
            <div className='banner__actions'>
                <Button variant='secondary' size='sm' onClick={() => openPanel('output')}>Show in output</Button>
            </div>
            <IconButton label='Dismiss' size='sm' onClick={() => setDismissed(key)}>
                <Icon glyph={X} size='sm' />
            </IconButton>
        </div>
    );
};

export default FailureBanner;
