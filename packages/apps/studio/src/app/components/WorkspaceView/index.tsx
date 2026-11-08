import { ChevronLeft } from 'lucide-react';
import TrafficLights from '@/app/components/TrafficLights';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import { useNavigationStore } from '@/shared/store/navigation';
import { useSimulationsStore } from '@/shared/store/simulations';
import '@/app/components/WorkspaceView/workspace-view.css';

const WorkspaceView = () => {
    const simulationId = useNavigationStore((state) => state.simulationId);
    const openDashboard = useNavigationStore((state) => state.openDashboard);
    const simulation = useSimulationsStore((state) => state.items.find((item) => item.id === simulationId));

    return (
        <div className='view'>
            <div className='ws'>
                <header className='ws-top'>
                    <div className='ws-top__left'>
                        <IconButton label='Back to simulations' tip='Back to simulations' onClick={openDashboard}>
                            <Icon glyph={ChevronLeft} size='sm' />
                        </IconButton>
                        <span className='ws-title'>{simulation?.name}</span>
                    </div>
                    <div className='ws-top__center' />
                    <div className='ws-top__right'>
                        <TrafficLights />
                    </div>
                </header>
            </div>
        </div>
    );
};

export default WorkspaceView;
