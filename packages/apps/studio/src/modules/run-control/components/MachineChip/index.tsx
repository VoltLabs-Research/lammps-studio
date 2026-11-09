import { ChevronDown } from 'lucide-react';
import { useDraftMachine } from '@/modules/run-control/hooks/use-workspace';
import Icon from '@/shared/components/Icon';
import { useWorkspaceStore } from '@/shared/store/workspace';
import '@/modules/run-control/components/MachineChip/machine-chip.css';

const MachineChip = () => {
    const machine = useDraftMachine();
    const openPanel = useWorkspaceStore((state) => state.openPanel);

    return (
        <button type='button' className='machine-chip' data-tip='Where this simulation runs' onClick={() => openPanel('config')}>
            <span>{machine?.name}</span>
            <Icon glyph={ChevronDown} size='xs' />
        </button>
    );
};

export default MachineChip;
