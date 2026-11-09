import { Machine } from '@lammps-studio/contracts/machine/domain';
import { SlurmOptions } from '@lammps-studio/contracts/run/domain';
import { useId } from 'react';
import { partitionsOf } from '@/modules/run-settings/utils/draft-defaults';
import { patchSlurm } from '@/modules/run-settings/utils/draft-edits';
import { partitionEntries } from '@/modules/run-settings/utils/setting-entries';
import { STEP_LIMITS } from '@/modules/run-settings/utils/step-limits';
import Group from '@/shared/components/Group';
import GroupRow from '@/shared/components/GroupRow';
import Popup from '@/shared/components/Popup';
import Stepper from '@/shared/components/Stepper';

interface SlurmSectionProps{
    machine: Machine;
    slurm: SlurmOptions;
}

const SlurmSection = ({ machine, slurm }: SlurmSectionProps) => {
    const timeId = useId();
    const accountId = useId();
    const [minNodes, maxNodes] = STEP_LIMITS.nodes;

    return (
        <Group title='Slurm job'>
            <GroupRow label='Partition'>
                <Popup label='Partition' value={slurm.partition} entries={partitionEntries(partitionsOf(machine), slurm.partition, (partition) => patchSlurm({ partition }))} />
            </GroupRow>
            <GroupRow label='Nodes'>
                <Stepper label='nodes' value={slurm.nodes} min={minNodes} max={maxNodes} onChange={(nodes) => patchSlurm({ nodes })} />
            </GroupRow>
            <GroupRow label={<label htmlFor={timeId}>Time limit</label>}>
                <input id={timeId} className='ginput mono' value={slurm.time} spellCheck={false} onChange={(event) => patchSlurm({ time: event.target.value })} />
            </GroupRow>
            <GroupRow label={<label htmlFor={accountId}>Account</label>}>
                <input id={accountId} className='ginput mono' value={slurm.account} spellCheck={false} onChange={(event) => patchSlurm({ account: event.target.value })} />
            </GroupRow>
        </Group>
    );
};

export default SlurmSection;
