import { Machine } from '@lammps-studio/contracts/machine/domain';
import { ChevronLeft } from 'lucide-react';
import { MACHINE_ICON, MACHINE_KIND_LABEL } from '@/modules/machines/utils/machine-labels';
import { useSettingsView } from '@/modules/settings/store/settings-view';
import { machineActionsOf, machineFactsOf } from '@/modules/settings/utils/machine-facts';
import Group from '@/shared/components/Group';
import GroupItem from '@/shared/components/GroupItem';
import GroupRow from '@/shared/components/GroupRow';
import Icon from '@/shared/components/Icon';
import { classNames } from '@/shared/utils/class-names';

interface MachineDetailProps{
    machine: Machine;
    status: string;
}

const MachineDetail = ({ machine, status }: MachineDetailProps) => {
    const showMachine = useSettingsView((state) => state.showMachine);
    const summary = [MACHINE_KIND_LABEL[machine.kind], status].filter(Boolean).join(' · ');

    return (
        <>
            <button type='button' className='settings__back' onClick={() => showMachine(null)}>
                <Icon glyph={ChevronLeft} size='sm' />
                Machines
            </button>
            <div className='settings__head'>
                <span className='settings__icon'><Icon glyph={MACHINE_ICON[machine.kind]} /></span>
                <div>
                    <div className='settings__name'>{machine.name}</div>
                    <div className='muted'>{summary}</div>
                </div>
            </div>
            <Group>
                {machineFactsOf(machine).map((fact) => (
                    <GroupRow key={fact.label} label={fact.label}>
                        <span className={classNames('grow__path', fact.mono && 'mono')}>{fact.value}</span>
                    </GroupRow>
                ))}
            </Group>
            <Group>
                {machineActionsOf(machine).map((action) => (
                    <GroupItem key={action.label} action danger={action.danger} title={action.label} disabled />
                ))}
            </Group>
        </>
    );
};

export default MachineDetail;
