import { Search } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import PaletteOption from '@/modules/palette/components/PaletteOption';
import { usePalette } from '@/modules/palette/hooks/use-palette';
import Icon from '@/shared/components/Icon';
import Kbd from '@/shared/components/Kbd';
import Modal from '@/shared/components/Modal';
import '@/shared/components/TextField/text-field.css';
import '@/shared/components/Menu/menu.css';
import '@/modules/palette/components/CommandPalette/command-palette.css';

const CommandPalette = () => {
    const { query, shown, active, run, onChange, onKeyDown } = usePalette();
    const listId = useId();
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
    }, [active]);

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
