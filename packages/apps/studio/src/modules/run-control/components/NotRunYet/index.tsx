import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { Atom } from 'lucide-react';
import { useDraftMachine } from '@/modules/run-control/hooks/use-workspace';
import { startPicking } from '@/modules/run-control/store/entry';
import { DEFAULT_ENTRY } from '@/modules/run-settings/utils/draft-defaults';
import Button from '@/shared/components/Button';
import Empty from '@/shared/components/Empty';

interface NotRunYetProps{
    simulation: Simulation;
}

const NotRunYet = ({ simulation }: NotRunYetProps) => {
    const machine = useDraftMachine();
    const entry = simulation.entry ?? DEFAULT_ENTRY;
    const picked = entry !== DEFAULT_ENTRY;
    const where = machine?.name ?? simulation.machineId;

    return (
        <Empty icon={Atom} title='Not run yet'>
            <p>Press Run to start {picked ? <span className='mono'>{entry}</span> : entry} on {where}.</p>
            {picked ? <Button variant='ghost' size='sm' onClick={() => startPicking(simulation.id)}>Change entry script</Button> : null}
        </Empty>
    );
};

export default NotRunYet;
