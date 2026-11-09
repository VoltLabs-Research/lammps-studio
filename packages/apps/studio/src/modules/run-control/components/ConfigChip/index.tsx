import { Cpu } from 'lucide-react';
import { useDraftConfig } from '@/modules/run-control/hooks/use-workspace';
import { configSummary } from '@/modules/run-control/utils/config-summary';
import Icon from '@/shared/components/Icon';
import { useWorkspaceStore } from '@/shared/store/workspace';
import '@/modules/run-control/components/ConfigChip/config-chip.css';

const ConfigChip = () => {
    const config = useDraftConfig();
    const openPanel = useWorkspaceStore((state) => state.openPanel);

    return (
        <button type='button' className='config-chip' data-tip='Build and run settings' onClick={() => openPanel('config')}>
            <Icon glyph={Cpu} size='sm' />
            <span>{config ? configSummary(config) : null}</span>
        </button>
    );
};

export default ConfigChip;
