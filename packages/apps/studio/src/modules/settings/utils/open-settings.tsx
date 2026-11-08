import SettingsSheet from '@/modules/settings/components/SettingsSheet';
import { SettingsTab, useSettingsView } from '@/modules/settings/store/settings-view';
import { openModal } from '@/shared/store/modal';

export const openSettings = (tab?: SettingsTab) => {
    if(tab) useSettingsView.getState().showTab(tab);
    openModal('settings', <SettingsSheet />);
};
