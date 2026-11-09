import { Machine } from '@lammps-studio/contracts/machine/domain';
import { RunConfig } from '@lammps-studio/contracts/run/domain';
import { ACCELERATORS } from '@lammps-studio/lammps/catalog/accelerators';
import { chooseAccelerator, patchDraft } from '@/modules/run-settings/utils/draft-edits';
import { acceleratorEntries } from '@/modules/run-settings/utils/setting-entries';
import { STEP_LIMITS } from '@/modules/run-settings/utils/step-limits';
import Group from '@/shared/components/Group';
import GroupRow from '@/shared/components/GroupRow';
import Popup from '@/shared/components/Popup';
import Stepper from '@/shared/components/Stepper';

interface ParallelSectionProps{
    config: RunConfig;
    machine: Machine;
}

const ParallelSection = ({ config, machine }: ParallelSectionProps) => {
    const accelerator = ACCELERATORS.find((option) => option.id === config.accelerator)?.label ?? config.accelerator;
    const [minRanks, maxRanks] = STEP_LIMITS.mpiRanks;
    const [minThreads, maxThreads] = STEP_LIMITS.threadsPerRank;

    return (
        <Group title='Parallel'>
            <GroupRow label='Acceleration'>
                <Popup label='Acceleration' value={accelerator} entries={acceleratorEntries(config.accelerator, chooseAccelerator)} />
            </GroupRow>
            <GroupRow label='MPI ranks'>
                <Stepper label='MPI ranks' value={config.mpiRanks} min={minRanks} max={maxRanks} onChange={(mpiRanks) => patchDraft({ mpiRanks })} />
            </GroupRow>
            <GroupRow label='Threads per rank'>
                <Stepper label='threads per rank' value={config.threadsPerRank} min={minThreads} max={maxThreads} onChange={(threadsPerRank) => patchDraft({ threadsPerRank })} />
            </GroupRow>
            {machine.gpus > 0
                ? (
                    <GroupRow label='GPUs'>
                        <Stepper label='GPUs' value={config.gpus} min={0} max={machine.gpus} onChange={(gpus) => patchDraft({ gpus })} />
                    </GroupRow>
                )
                : null}
        </Group>
    );
};

export default ParallelSection;
