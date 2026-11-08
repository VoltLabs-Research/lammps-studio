import { Plus } from 'lucide-react';
import BuildRow from '@/modules/settings/components/BuildRow';
import { openNewBuild } from '@/modules/settings/utils/open-new-build';
import Group from '@/shared/components/Group';
import GroupItem from '@/shared/components/GroupItem';
import { useMachines } from '@/shared/hooks/use-machines';
import { useBuildsStore } from '@/shared/store/builds';

const BuildsTab = () => {
    const machines = useMachines();
    const builds = useBuildsStore((state) => state.items);

    return (
        <>
            {machines.map((machine) => {
                const onMachine = builds.filter((build) => build.machineId === machine.id);
                if(onMachine.length === 0) return null;

                return (
                    <Group key={machine.id} title={machine.name}>
                        {onMachine.map((build) => <BuildRow key={build.hash} build={build} />)}
                    </Group>
                );
            })}
            <Group>
                <GroupItem action icon={Plus} title='New build…' onClick={openNewBuild} />
            </Group>
        </>
    );
};

export default BuildsTab;
