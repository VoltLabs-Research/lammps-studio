import { Run } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { LoaderCircle } from 'lucide-react';
import Empty from '@/shared/components/Empty';

interface StartingRunProps{
    simulation: Simulation;
    run: Run;
}

const StartingRun = ({ simulation, run }: StartingRunProps) => (
    <Empty icon={LoaderCircle} title='Starting LAMMPS' spin>
        <p>Copying {run.config.entry} and the rest of {simulation.folder} into the container and launching {run.config.mpiRanks} MPI ranks.</p>
    </Empty>
);

export default StartingRun;
