import { ChevronLeft } from 'lucide-react';
import TrafficLights from '@/app/components/TrafficLights';
import ConfigChip from '@/modules/run-control/components/ConfigChip';
import MachineChip from '@/modules/run-control/components/MachineChip';
import RunButton from '@/modules/run-control/components/RunButton';
import RunChip from '@/modules/run-control/components/RunChip';
import { useOpenSimulation } from '@/modules/run-control/hooks/use-workspace';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import { useNavigationStore } from '@/shared/store/navigation';
import '@/app/components/WorkspaceHeader/workspace-header.css';

const WorkspaceHeader = () => {
    const simulation = useOpenSimulation();
    const openDashboard = useNavigationStore((state) => state.openDashboard);

    return (
        <header className='ws-top'>
            <div className='ws-top__left'>
                <IconButton label='Back to simulations' tip='Back to simulations' onClick={openDashboard}>
                    <Icon glyph={ChevronLeft} size='sm' />
                </IconButton>
                <span className='ws-title'>{simulation?.name}</span>
                <MachineChip />
            </div>
            <div className='ws-top__center'>
                <RunChip />
            </div>
            <div className='ws-top__right'>
                <ConfigChip />
                <RunButton />
                <TrafficLights />
            </div>
        </header>
    );
};

export default WorkspaceHeader;
