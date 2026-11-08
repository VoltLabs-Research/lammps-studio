import { X } from 'lucide-react';
import { ComponentType } from 'react';
import BuildsTab from '@/modules/settings/components/BuildsTab';
import GeneralTab from '@/modules/settings/components/GeneralTab';
import MachinesTab from '@/modules/settings/components/MachinesTab';
import { SettingsTab, useSettingsView } from '@/modules/settings/store/settings-view';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import Modal from '@/shared/components/Modal';
import Seg from '@/shared/components/Seg';
import { SegOption } from '@/shared/contracts/ui';
import { useModal } from '@/shared/hooks/use-modal';
import '@/modules/settings/components/SettingsSheet/settings-sheet.css';

const TABS: SegOption<SettingsTab>[] = [
    { value: 'general', label: 'General' },
    { value: 'machines', label: 'Machines' },
    { value: 'builds', label: 'Builds' }
];

const TAB_CONTENT: Record<SettingsTab, ComponentType> = {
    general: GeneralTab,
    machines: MachinesTab,
    builds: BuildsTab
};

const SettingsSheet = () => {
    const { close } = useModal();
    const tab = useSettingsView((state) => state.tab);
    const machineId = useSettingsView((state) => state.machineId);
    const showTab = useSettingsView((state) => state.showTab);
    const Content = TAB_CONTENT[tab];

    return (
        <Modal label='Settings' className='modal--wide settings-modal' initialFocus='dialog'>
            <div className='settings'>
                <div className='settings__bar'>
                    <h2>Settings</h2>
                    <Seg label='Settings sections' options={TABS} value={tab} onChange={showTab} />
                    <IconButton label='Close' onClick={close}>
                        <Icon glyph={X} />
                    </IconButton>
                </div>
                <div key={`${tab}-${machineId}`} className='settings__body'>
                    <Content />
                </div>
            </div>
        </Modal>
    );
};

export default SettingsSheet;
