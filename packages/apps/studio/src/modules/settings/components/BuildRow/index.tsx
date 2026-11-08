import { Build } from '@lammps-studio/contracts/build/domain';
import GroupItem from '@/shared/components/GroupItem';
import Ring from '@/shared/components/Ring';
import { useNow } from '@/shared/hooks/use-now';
import { formatAgo, formatBytes, formatPercent } from '@/shared/utils/format';

interface BuildRowProps{
    build: Build;
}

const HASH_LENGTH = 12;
const CORE_ONLY = 'Core only';

const usage = (count: number): string => `${count} simulation${count === 1 ? '' : 's'}`;

const BuildRow = ({ build }: BuildRowProps) => {
    const now = useNow();
    const hash = build.hash.slice(0, HASH_LENGTH);
    const title = build.packages.length > 0 ? build.packages.join(', ') : CORE_ONLY;

    if(build.status === 'building'){
        return (
            <GroupItem
                title={title}
                sub={`${hash} · building`}
                subMono
                value={<><Ring value={build.progress} /><span className='num'>{formatPercent(build.progress)}</span></>}
            />
        );
    }

    const size = build.sizeBytes === null ? '—' : formatBytes(build.sizeBytes);
    const value = build.status === 'failed' ? <span className='danger-ink'>Failed</span> : formatAgo(build.createdAt, now);

    return <GroupItem title={title} sub={`${hash} · ${size} · ${usage(build.usedBy)}`} subMono value={value} />;
};

export default BuildRow;
