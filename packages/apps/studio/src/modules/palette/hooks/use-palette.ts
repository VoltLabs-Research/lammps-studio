import { ChangeEvent, KeyboardEvent, useState } from 'react';
import { Command } from '@/modules/palette/contracts/command';
import { useDashboardCommands } from '@/modules/palette/hooks/use-dashboard-commands';
import { WORKSPACE_COMMANDS } from '@/modules/palette/utils/workspace-commands';
import { useModal } from '@/shared/hooks/use-modal';
import { useNavigationStore } from '@/shared/store/navigation';

export interface PaletteState{
    query: string;
    shown: Command[];
    active: number;
    run: (command: Command) => void;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

const MOVES: Record<string, number> = {
    ArrowDown: 1,
    ArrowUp: -1
};

export const usePalette = (): PaletteState => {
    const { close } = useModal();
    const inWorkspace = useNavigationStore((state) => state.view === 'workspace');
    const dashboard = useDashboardCommands();
    const commands = inWorkspace ? [...WORKSPACE_COMMANDS, ...dashboard] : dashboard;
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);

    const needle = query.toLowerCase().trim();
    const shown = commands.filter((command) => command.label.toLowerCase().includes(needle));
    const active = Math.min(selected, shown.length - 1);

    const run = (command: Command) => {
        close();
        command.run();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        const move = MOVES[event.key];
        if(move !== undefined){
            event.preventDefault();
            setSelected(Math.max(0, Math.min(shown.length - 1, active + move)));
            return;
        }

        const command = shown.at(active);
        if(event.key === 'Enter' && command) run(command);
    };

    return {
        query,
        shown,
        active,
        run,
        onChange: (event) => {
            setQuery(event.target.value);
            setSelected(0);
        },
        onKeyDown
    };
};
