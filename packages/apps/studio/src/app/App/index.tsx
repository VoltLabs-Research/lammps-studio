import DashboardView from '@/app/components/DashboardView';
import WorkspaceView from '@/app/components/WorkspaceView';
import { useGlobalKeys } from '@/app/hooks/use-global-keys';
import { openPalette } from '@/modules/palette/utils/open-palette';
import { openSettings } from '@/modules/settings/utils/open-settings';
import SimulationsPage from '@/modules/simulations/components/SimulationsPage';
import ModalRoot from '@/shared/components/ModalRoot';
import ToastRoot from '@/shared/components/ToastRoot';
import { useNavigationStore } from '@/shared/store/navigation';
import '@/app/App/app.css';

const openMachines = () => openSettings('machines');
const openLastSettings = () => openSettings();

const App = () => {
    const view = useNavigationStore((state) => state.view);
    useGlobalKeys(openPalette);

    return (
        <>
            <div className='window'>
                {view === 'dashboard'
                    ? (
                        <DashboardView onSearch={openPalette} onSettings={openLastSettings}>
                            <SimulationsPage onManageMachines={openMachines} />
                        </DashboardView>
                    )
                    : <WorkspaceView />}
            </div>
            <ModalRoot />
            <ToastRoot />
        </>
    );
};

export default App;
