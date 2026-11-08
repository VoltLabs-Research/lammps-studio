import NewBuildSheet from '@/modules/settings/components/NewBuildSheet';
import { openModal } from '@/shared/store/modal';

export const openNewBuild = () => openModal('new-build', <NewBuildSheet />);
