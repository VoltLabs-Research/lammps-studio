import CommandPalette from '@/modules/palette/components/CommandPalette';
import { openModal } from '@/shared/store/modal';

export const openPalette = () => openModal('palette', <CommandPalette />);
