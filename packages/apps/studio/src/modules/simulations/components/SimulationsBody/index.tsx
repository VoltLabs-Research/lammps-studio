import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { Atom, CircleAlert } from 'lucide-react';
import SimulationCard from '@/modules/simulations/components/SimulationCard';
import Button from '@/shared/components/Button';
import Empty from '@/shared/components/Empty';
import { useSimulationsStore } from '@/shared/store/simulations';
import { sharedErrorCopy } from '@/shared/utils/error-copy';
import '@/modules/simulations/components/SimulationsBody/simulations-body.css';

interface SimulationsBodyProps{
    simulations: Simulation[];
    machine: Machine | null;
    onMachine: number;
}

const emptyText = (machine: Machine | null, onMachine: number): string => {
    if(onMachine > 0) return 'No simulation matches this filter.';
    if(machine) return `No simulations on ${machine.name} yet.`;

    return 'No simulations yet.';
};

const SimulationsBody = ({ simulations, machine, onMachine }: SimulationsBodyProps) => {
    const status = useSimulationsStore((state) => state.status);
    const error = useSimulationsStore((state) => state.error);
    const load = useSimulationsStore((state) => state.load);

    if(status === 'loading') return null;
    if(status === 'failed'){
        return (
            <Empty icon={CircleAlert} title='Simulations didn’t load' className='simulations__empty'>
                <p>{sharedErrorCopy(error)}</p>
                <Button size='sm' onClick={load}>Try again</Button>
            </Empty>
        );
    }

    if(simulations.length === 0){
        return (
            <Empty icon={Atom} title='Nothing here' className='simulations__empty'>
                <p>{emptyText(machine, onMachine)}</p>
            </Empty>
        );
    }

    return (
        <div className='grid'>
            {simulations.map((simulation) => <SimulationCard key={simulation.id} simulation={simulation} />)}
        </div>
    );
};

export default SimulationsBody;
