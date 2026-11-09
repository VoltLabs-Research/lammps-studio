import ActivityBar from '@/app/components/ActivityBar';
import PanelHost from '@/app/components/PanelHost';
import WorkspaceHeader from '@/app/components/WorkspaceHeader';
import { useWorkspaceSession } from '@/app/hooks/use-workspace-session';
import Statusbar from '@/modules/run-control/components/Statusbar';
import WorkspaceViewport from '@/modules/viewport/components/WorkspaceViewport';
import { useNavigationStore } from '@/shared/store/navigation';
import '@/app/components/WorkspaceView/workspace-view.css';

const WorkspaceView = () => {
    const simulationId = useNavigationStore((state) => state.simulationId);
    useWorkspaceSession(simulationId);

    return (
        <div className='view'>
            <div className='ws'>
                <WorkspaceHeader />
                <div className='ws-body'>
                    <ActivityBar />
                    <PanelHost />
                    <WorkspaceViewport />
                </div>
                <Statusbar />
            </div>
        </div>
    );
};

export default WorkspaceView;
