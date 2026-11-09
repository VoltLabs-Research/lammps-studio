import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import { KeyboardEvent, MouseEvent, useRef, useState } from 'react';
import FinderRow from '@/modules/files/components/FinderRow';
import type { FileContext } from '@/modules/files/domain/files';
import { fileMenuEntries } from '@/modules/files/utils/file-menu';
import { finderKeyAction } from '@/modules/files/utils/finder-keys';
import Menu from '@/shared/components/Menu';
import { Point } from '@/shared/contracts/menu';
import { useMenu } from '@/shared/hooks/use-menu';
import { useNow } from '@/shared/hooks/use-now';
import '@/modules/files/components/FinderList/finder.css';

interface FinderListProps{
    label: string;
    entries: FileEntry[];
    loaded: boolean;
    selected: string | null;
    context: FileContext;
    foot: string;
    onSelect: (path: string | null) => void;
    onOpen: (entry: FileEntry) => void;
    onParent: () => void;
}

const MENU_WIDTH = 210;

const FinderList = ({ label, entries, loaded, selected, context, foot, onSelect, onOpen, onParent }: FinderListProps) => {
    const list = useRef<HTMLDivElement>(null);
    const menu = useMenu();
    const [menuEntry, setMenuEntry] = useState<FileEntry | null>(null);
    const now = useNow();
    const focusable = selected ?? entries[0]?.path ?? null;

    const select = (path: string) => {
        onSelect(path);
        const row = list.current?.querySelector<HTMLElement>(`[data-path="${CSS.escape(path)}"]`);
        row?.focus({ preventScroll: true });
        row?.scrollIntoView({ block: 'nearest' });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const action = finderKeyAction({ key: event.key, command: event.metaKey || event.ctrlKey }, entries, selected);
        if(!action) return;

        event.preventDefault();
        const entry = entries.find((candidate) => candidate.path === selected);
        if(action.kind === 'parent') onParent();
        if(action.kind === 'open' && entry) onOpen(entry);
        if(action.kind === 'select') select(action.path);
    };

    const onListClick = (event: MouseEvent<HTMLDivElement>) => {
        if(event.target === event.currentTarget) onSelect(null);
    };

    const openMenu = (entry: FileEntry, at: Point) => {
        setMenuEntry(entry);
        menu.openAt(at);
    };

    return (
        <>
            <div className='finder' role='grid' aria-label={`Files in ${label}`} onKeyDown={onKeyDown}>
                <div className='finder__head' role='row'>
                    <span role='columnheader'>Name</span>
                    <span role='columnheader'>Size</span>
                    <span className='frow__mod' role='columnheader'>Date modified</span>
                    <span className='frow__kind' role='columnheader'>Kind</span>
                </div>
                <div ref={list} className='finder__list' role='rowgroup' onClick={onListClick}>
                    {entries.map((entry) => (
                        <FinderRow
                            key={entry.path}
                            entry={entry}
                            selected={entry.path === selected}
                            focusable={entry.path === focusable}
                            now={now}
                            onSelect={select}
                            onOpen={onOpen}
                            onMenu={openMenu}
                        />
                    ))}
                    {loaded && entries.length === 0 && <div className='finder__empty'>This folder is empty</div>}
                </div>
                <div className='finder__foot'>{foot}</div>
            </div>
            <Menu menu={menu} entries={menuEntry ? fileMenuEntries(menuEntry, context) : []} width={MENU_WIDTH} align='left' />
        </>
    );
};

export default FinderList;
