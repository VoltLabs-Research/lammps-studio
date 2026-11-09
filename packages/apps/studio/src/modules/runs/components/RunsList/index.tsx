import RunStatus from '@/modules/runs/components/RunStatus';
import type { RunGroupModel, RunRowModel } from '@/modules/runs/domain/runs';
import Group from '@/shared/components/Group';
import GroupItem from '@/shared/components/GroupItem';

interface RunsListProps{
    groups: RunGroupModel[];
    onOpen: (row: RunRowModel) => void;
}

const RunsList = ({ groups, onOpen }: RunsListProps) => (
    <div className='pane'>
        {groups.map((group) => (
            <Group key={group.title} title={group.title}>
                {group.rows.map((row) => (
                    <GroupItem
                        key={row.number}
                        title={`Run ${row.number}`}
                        sub={row.sub}
                        value={<RunStatus status={row.status} />}
                        chevron
                        disabled={row.disabled}
                        onClick={() => onOpen(row)}
                    />
                ))}
            </Group>
        ))}
    </div>
);

export default RunsList;
