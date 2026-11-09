import { Settings } from 'lucide-react';
import ActivityButton from '@/app/components/ActivityButton';
import { ACTIVITY } from '@/app/config/activity';
import { useUnseenWarnings } from '@/app/hooks/use-unseen-warnings';
import { openSettings } from '@/modules/settings/utils/open-settings';
import { useMachines } from '@/shared/hooks/use-machines';
import { useWorkspaceStore } from '@/shared/store/workspace';
import '@/app/components/ActivityBar/activity-bar.css';

const openLastSettings = () => openSettings();

const ActivityBar = () => {
    const panel = useWorkspaceStore((state) => state.panel);
    const panelOpen = useWorkspaceStore((state) => state.panelOpen);
    const togglePanel = useWorkspaceStore((state) => state.togglePanel);
    const warnings = useUnseenWarnings();
    const offline = useMachines().filter((machine) => machine.status === 'offline').length;

    return (
        <nav className='activity' aria-label='Panels'>
            {ACTIVITY.map((entry) => (
                <ActivityButton
                    key={entry.panel}
                    label={entry.label}
                    tip={entry.tip}
                    icon={entry.icon}
                    pressed={panelOpen && panel === entry.panel}
                    badge={entry.panel === 'output' ? warnings : 0}
                    badgeTone='warn'
                    onClick={() => togglePanel(entry.panel)}
                />
            ))}
            <span className='activity__spacer' />
            <ActivityButton label='Settings' tip='Settings' icon={Settings} badge={offline} onClick={openLastSettings} />
        </nav>
    );
};

export default ActivityBar;
