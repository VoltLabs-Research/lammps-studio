import { Machine } from '@lammps-studio/contracts/machine/domain';
import { ChevronsUpDown } from 'lucide-react';
import { MACHINE_ICON } from '@/modules/machines/utils/machine-labels';
import { machineStatusOf } from '@/modules/machines/utils/machine-status';
import { useFiltersStore } from '@/modules/simulations/store/filters';
import Icon from '@/shared/components/Icon';
import Menu from '@/shared/components/Menu';
import { MENU_SEPARATOR, MenuEntry } from '@/shared/contracts/menu';
import { useMenu } from '@/shared/hooks/use-menu';
import { useSimulationsStore } from '@/shared/store/simulations';
import '@/modules/simulations/components/MachineFilter/machine-filter.css';

interface MachineFilterProps{
    machine: Machine | null;
    machines: Machine[];
    onManageMachines: () => void;
}

const MENU_WIDTH = 270;
const ALL_MACHINES = 'All machines';

const MachineFilter = ({ machine, machines, onManageMachines }: MachineFilterProps) => {
    const menu = useMenu();
    const simulations = useSimulationsStore((state) => state.items);
    const showMachine = useFiltersStore((state) => state.showMachine);
    const name = machine?.name ?? ALL_MACHINES;

    const entries: MenuEntry[] = [
        { id: 'all', label: ALL_MACHINES, checked: machine === null, run: () => showMachine(null) },
        ...machines.map((item) => ({
            id: item.id,
            label: item.name,
            hint: machineStatusOf(item, simulations),
            checked: machine?.id === item.id,
            run: () => showMachine(item.id)
        })),
        MENU_SEPARATOR,
        { id: 'manage', label: 'Manage machines…', run: onManageMachines }
    ];

    return (
        <>
            <button
                type='button'
                className='filter-pop'
                aria-haspopup='menu'
                aria-expanded={menu.anchor !== null}
                aria-label={`Machine: ${name}`}
                onClick={(event) => menu.toggle(event.currentTarget)}
            >
                {machine ? <Icon glyph={MACHINE_ICON[machine.kind]} size='sm' /> : null}
                <span>{name}</span>
                <Icon glyph={ChevronsUpDown} size='xs' />
            </button>
            <Menu menu={menu} entries={entries} width={MENU_WIDTH} />
        </>
    );
};

export default MachineFilter;
