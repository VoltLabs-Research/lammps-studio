import type { RunRowStatus } from '@/modules/runs/domain/runs';
import Ring from '@/shared/components/Ring';
import { formatPercent } from '@/shared/utils/format';

interface RunStatusProps{
    status: RunRowStatus;
}

const RunStatus = ({ status }: RunStatusProps) => {
    if(status.kind === 'progress'){
        return (
            <>
                <Ring value={status.fraction} />
                <span className='num'>{formatPercent(status.fraction)}</span>
            </>
        );
    }

    if(status.danger) return <span className='danger-ink'>{status.word}</span>;

    return status.word;
};

export default RunStatus;
