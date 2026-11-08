import { Search } from 'lucide-react';
import { ChangeEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import PaletteOption from '@/modules/palette/components/PaletteOption';
import { Command } from '@/modules/palette/contracts/command';
import { useDashboardCommands } from '@/modules/palette/hooks/use-dashboard-commands';
import Icon from '@/shared/components/Icon';
import Kbd from '@/shared/components/Kbd';
import Modal from '@/shared/components/Modal';
import { useModal } from '@/shared/hooks/use-modal';
import '@/shared/components/TextField/text-field.css';
import '@/shared/components/Menu/menu.css';
import '@/modules/palette/components/CommandPalette/command-palette.css';

const CommandPalette = () => {
    const { close } = useModal();
    const commands = useDashboardCommands();
    const listId = useId();
    const listRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);

    const needle = query.toLowerCase().trim();
    const shown = commands.filter((command) => command.label.toLowerCase().includes(needle));
    const active = Math.min(selected, shown.length - 1);

    useEffect(() => {
        listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const run = (command: Command) => {
        close();
        command.run();
    };

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
        setSelected(0);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if(event.key === 'ArrowDown' || event.key === 'ArrowUp'){
            event.preventDefault();
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setSelected(Math.max(0, Math.min(shown.length - 1, active + step)));
            return;
        }

        const command = shown.at(active);
        if(event.key === 'Enter' && command) run(command);
    };

    return (
        <Modal label='Command palette' className='palette' placement='top'>
            <div className='palette__search'>
                <Icon glyph={Search} size='sm' />
                <input
                    className='field palette__input'
                    placeholder='Run a command, open a file or plot a column'
                    aria-label='Search commands'
                    role='combobox'
                    aria-expanded='true'
                    aria-controls={listId}
                    aria-activedescendant={active < 0 ? undefined : `${listId}-${active}`}
                    autoComplete='off'
                    value={query}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                />
                <Kbd>Esc</Kbd>
            </div>
            <div className='menu-sep' />
            <div id={listId} ref={listRef} className='palette__list' role='listbox' aria-label='Commands'>
                {shown.length === 0
                    ? <div className='menu-caption palette__none'>No command matches.</div>
                    : shown.map((command, index) => (
                        <PaletteOption key={command.id} id={`${listId}-${index}`} command={command} selected={index === active} onRun={run} />
                    ))}
            </div>
        </Modal>
    );
};

export default CommandPalette;
