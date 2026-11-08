import { Plus } from 'lucide-react';
import { MACHINE_ICON, MACHINE_KIND_LABEL } from '@/modules/machines/utils/machine-labels';
import { machineStatusOf } from '@/modules/machines/utils/machine-status';
import MachineDetail from '@/modules/settings/components/MachineDetail';
import { useSettingsView } from '@/modules/settings/store/settings-view';
import Group from '@/shared/components/Group';
import GroupItem from '@/shared/components/GroupItem';
import { useMachinesStore } from '@/shared/store/machines';
import { useSimulationsStore } from '@/shared/store/simulations';

const MachinesTab = () => {
    const machines = useMachinesStore((state) => state.items);
    const simulations = useSimulationsStore((state) => state.items);
    const machineId = useSettingsView((state) => state.machineId);
    const showMachine = useSettingsView((state) => state.showMachine);

    const machine = machines.find((item) => item.id === machineId);
    if(machine) return <MachineDetail machine={machine} status={machineStatusOf(machine, simulations)} />;

    return (
        <Group>
            {machines.map((item) => (
                <GroupItem
                    key={item.id}
                    icon={MACHINE_ICON[item.kind]}
                    title={item.name}
                    sub={`${MACHINE_KIND_LABEL[item.kind]} · ${item.runtime}`}
                    value={machineStatusOf(item, simulations)}
                    chevron
                    onClick={() => showMachine(item.id)}
                />
            ))}
            <GroupItem action icon={Plus} title='Connect a cluster…' disabled />
        </Group>
    );
};

export default MachinesTab;
