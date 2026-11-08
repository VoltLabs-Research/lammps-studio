import { Plus } from 'lucide-react';
import MachineFilter from '@/modules/simulations/components/MachineFilter';
import SimulationsBody from '@/modules/simulations/components/SimulationsBody';
import { useVisibleSimulations } from '@/modules/simulations/hooks/use-visible-simulations';
import { useFiltersStore } from '@/modules/simulations/store/filters';
import { openNewSimulation } from '@/modules/simulations/utils/open-new-simulation';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Seg from '@/shared/components/Seg';
import '@/modules/simulations/components/SimulationsPage/simulations-page.css';

interface SimulationsPageProps{
    onManageMachines: () => void;
}

const SimulationsPage = ({ onManageMachines }: SimulationsPageProps) => {
    const { machine, machines, filters, simulations, onMachine } = useVisibleSimulations();
    const status = useFiltersStore((state) => state.status);
    const setStatus = useFiltersStore((state) => state.setStatus);

    return (
        <div className='page'>
            <div className='page-title-row'>
                <h1 className='page-title'>Simulations</h1>
                <Button variant='primary' onClick={openNewSimulation}>
                    <Icon glyph={Plus} size='sm' />
                    New simulation
                </Button>
            </div>
            <div className='filter-row'>
                <Seg label='Filter simulations' options={filters} value={status} onChange={setStatus} />
                <MachineFilter machine={machine} machines={machines} onManageMachines={onManageMachines} />
            </div>
            <SimulationsBody simulations={simulations} machine={machine} onMachine={onMachine} />
        </div>
    );
};

export default SimulationsPage;
