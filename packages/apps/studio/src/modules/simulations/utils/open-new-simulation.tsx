import NewSimulationModal from '@/modules/simulations/components/NewSimulationModal';
import { openModal } from '@/shared/store/modal';

export const openNewSimulation = () => openModal('new-simulation', <NewSimulationModal />);
