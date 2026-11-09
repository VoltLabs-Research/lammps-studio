import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { chooseMachine } from '@/modules/run-settings/utils/draft-edits';
import { folderOf, machineFoot } from '@/modules/run-settings/utils/setting-facts';
import { machineEntries } from '@/modules/settings/utils/build-entries';
import Group from '@/shared/components/Group';
import GroupRow from '@/shared/components/GroupRow';
import Popup from '@/shared/components/Popup';
import { useMachines } from '@/shared/hooks/use-machines';

interface MachineSectionProps{
    simulation: Simulation;
    machine: Machine;
}

const MachineSection = ({ simulation, machine }: MachineSectionProps) => {
    const machines = useMachines();
    const folder = folderOf(machine, simulation.folder);

    const choose = (machineId: string) => {
        const next = machines.find((other) => other.id === machineId);
        if(next) chooseMachine(next);
    };

    return (
        <Group title='Machine' foot={machineFoot(machine)}>
            <GroupRow label='Run on'>
                <Popup label='Run on' value={machine.name} entries={machineEntries(machines, machine.id, choose)} />
            </GroupRow>
            <GroupRow label='Folder'>
                <span className='mono muted grow__path' title={folder}>{folder}</span>
            </GroupRow>
        </Group>
    );
};

export default MachineSection;
