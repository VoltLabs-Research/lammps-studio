import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { Copy, Ellipsis, ExternalLink, Folder, X } from 'lucide-react';
import DeleteSimulationDialog from '@/modules/simulations/components/DeleteSimulationDialog';
import { duplicateSimulation, folderOf, showFolder } from '@/modules/simulations/utils/simulation-actions';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import Menu from '@/shared/components/Menu';
import { MENU_SEPARATOR, MenuEntry } from '@/shared/contracts/menu';
import { useMenu } from '@/shared/hooks/use-menu';
import { openModal } from '@/shared/store/modal';
import { useNavigationStore } from '@/shared/store/navigation';

interface CardMenuProps{
    simulation: Simulation;
    machine: Machine | undefined;
}

const MENU_WIDTH = 200;

const CardMenu = ({ simulation, machine }: CardMenuProps) => {
    const menu = useMenu();
    const openWorkspace = useNavigationStore((state) => state.openWorkspace);
    const folder = folderOf(simulation, machine);

    const entries: MenuEntry[] = [
        { id: 'open', label: 'Open', icon: ExternalLink, run: () => openWorkspace(simulation.id) },
        { id: 'duplicate', label: 'Duplicate', icon: Copy, run: () => duplicateSimulation(simulation) },
        { id: 'folder', label: 'Show folder', icon: Folder, run: () => showFolder(folder) },
        MENU_SEPARATOR,
        {
            id: 'delete',
            label: 'Delete',
            icon: X,
            danger: true,
            run: () => openModal('delete-simulation', <DeleteSimulationDialog simulation={simulation} folder={folder} />)
        }
    ];

    return (
        <div className='card__menu'>
            <IconButton
                size='sm'
                label={`More actions for ${simulation.name}`}
                aria-haspopup='menu'
                aria-expanded={menu.anchor !== null}
                onClick={(event) => menu.toggle(event.currentTarget)}
            >
                <Icon glyph={Ellipsis} size='sm' />
            </IconButton>
            <Menu menu={menu} entries={entries} width={MENU_WIDTH} />
        </div>
    );
};

export default CardMenu;
