import { RunConfig } from '@lammps-studio/contracts/run/domain';
import { runCommand } from '@lammps-studio/lammps/command/run-command';
import { Copy } from 'lucide-react';
import { useEffect } from 'react';
import { loadEntryCandidates, startPicking, useEntryStore } from '@/modules/run-control/store/entry';
import { chooseEntry } from '@/modules/run-control/utils/entry-actions';
import { entryEntries } from '@/modules/run-settings/utils/setting-entries';
import Group from '@/shared/components/Group';
import GroupRow from '@/shared/components/GroupRow';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import Popup from '@/shared/components/Popup';
import { copyText } from '@/shared/services/clipboard';

interface ScriptSectionProps{
    simulationId: string;
    entry: string | null;
    config: RunConfig;
    buildHash: string | null;
}

const NO_ENTRY = 'Choose a file';

const ScriptSection = ({ simulationId, entry, config, buildHash }: ScriptSectionProps) => {
    const candidates = useEntryStore((state) => (state.simulationId === simulationId ? state.candidates : []));
    const command = runCommand(config, buildHash);

    useEffect(() => {
        void loadEntryCandidates(simulationId);
    }, [simulationId]);

    const entries = entryEntries(candidates, entry, (path) => void chooseEntry(simulationId, path), () => startPicking(simulationId));

    return (
        <Group title='Script'>
            <GroupRow label='Entry script'>
                <Popup label='Entry script' value={entry ?? NO_ENTRY} entries={entries} />
            </GroupRow>
            <div className='grow grow--cmd'>
                <code className='grow__cmd'>{command}</code>
                <IconButton label='Copy command' tip='Copy command' size='sm' onClick={() => void copyText(command, 'Copied the command')}>
                    <Icon glyph={Copy} size='sm' />
                </IconButton>
            </div>
        </Group>
    );
};

export default ScriptSection;
