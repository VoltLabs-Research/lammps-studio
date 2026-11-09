import ActivityBar from '@/app/components/ActivityBar';
import PanelHost from '@/app/components/PanelHost';
import WorkspaceHeader from '@/app/components/WorkspaceHeader';
import { useWorkspaceKeys } from '@/app/hooks/use-workspace-keys';
import { useWorkspaceSession } from '@/app/hooks/use-workspace-session';
import FailureBanner from '@/modules/run-control/components/FailureBanner';
import RunOverlay from '@/modules/run-control/components/RunOverlay';
import Statusbar from '@/modules/run-control/components/Statusbar';
import { useOpenSimulation } from '@/modules/run-control/hooks/use-workspace';
import WorkspaceViewport from '@/modules/viewport/components/WorkspaceViewport';
import { useNavigationStore } from '@/shared/store/navigation';
import '@/app/components/WorkspaceView/workspace-view.css';

const WorkspaceView = () => {
    const simulationId = useNavigationStore((state) => state.simulationId);
    const simulation = useOpenSimulation();
    useWorkspaceSession(simulationId);
    useWorkspaceKeys();

    return (
        <div className='view'>
            <div className='ws'>
                <WorkspaceHeader />
                <div className='ws-body'>
                    <ActivityBar />
                    <PanelHost />
                    <WorkspaceViewport banner={<FailureBanner />}>
                        {simulation ? <RunOverlay simulation={simulation} /> : null}
                    </WorkspaceViewport>
                </div>
                <Statusbar />
            </div>
        </div>
    );
};

export default WorkspaceView;
