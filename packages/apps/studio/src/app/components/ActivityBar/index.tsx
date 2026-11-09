import { Settings } from 'lucide-react';
import ActivityButton from '@/app/components/ActivityButton';
import { ACTIVITY } from '@/app/config/activity';
import { useRunFileCount } from '@/app/hooks/use-run-file-count';
import { useUnseenWarnings } from '@/app/hooks/use-unseen-warnings';
import { openSettings } from '@/modules/settings/utils/open-settings';
import { PanelId } from '@/shared/contracts/workspace';
import { useMachines } from '@/shared/hooks/use-machines';
import { useWorkspaceStore } from '@/shared/store/workspace';
import '@/app/components/ActivityBar/activity-bar.css';

const openLastSettings = () => openSettings();

const ActivityBar = () => {
    const panel = useWorkspaceStore((state) => state.panel);
    const panelOpen = useWorkspaceStore((state) => state.panelOpen);
    const togglePanel = useWorkspaceStore((state) => state.togglePanel);
    const warnings = useUnseenWarnings();
    const files = useRunFileCount();
    const offline = useMachines().filter((machine) => machine.status === 'offline').length;
    const badges: Partial<Record<PanelId, number>> = { output: warnings, files };

    return (
        <nav className='activity' aria-label='Panels'>
            {ACTIVITY.map((entry) => (
                <ActivityButton
                    key={entry.panel}
                    label={entry.label}
                    tip={entry.tip}
                    icon={entry.icon}
                    pressed={panelOpen && panel === entry.panel}
                    badge={badges[entry.panel] ?? 0}
                    badgeTone={entry.panel === 'output' ? 'warn' : 'info'}
                    onClick={() => togglePanel(entry.panel)}
                />
            ))}
            <span className='activity__spacer' />
            <ActivityButton label='Settings' tip='Settings' icon={Settings} badge={offline} onClick={openLastSettings} />
        </nav>
    );
};

export default ActivityBar;
