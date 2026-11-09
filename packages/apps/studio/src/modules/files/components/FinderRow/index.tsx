import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import { File, FileCode, Film, Folder, HardDrive, LucideIcon, SquareTerminal } from 'lucide-react';
import { MouseEvent } from 'react';
import { entrySize } from '@/modules/files/utils/finder';
import Icon from '@/shared/components/Icon';
import { Point } from '@/shared/contracts/menu';
import { formatDayTime } from '@/shared/utils/format';
import '@/modules/files/components/FinderRow/finder-row.css';

interface FinderRowProps{
    entry: FileEntry;
    selected: boolean;
    focusable: boolean;
    now: number;
    onSelect: (path: string) => void;
    onOpen: (entry: FileEntry) => void;
    onMenu: (entry: FileEntry, at: Point) => void;
}

const KIND_ICON: Record<string, LucideIcon> = {
    'Folder': Folder,
    'LAMMPS input': FileCode,
    'LAMMPS log': SquareTerminal,
    'Dump, text': Film,
    'Restart, binary': HardDrive
};

const FinderRow = ({ entry, selected, focusable, now, onSelect, onOpen, onMenu }: FinderRowProps) => {
    const onContextMenu = (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        onSelect(entry.path);
        onMenu(entry, { x: event.clientX, y: event.clientY });
    };

    return (
        <div
            className='frow'
            role='row'
            tabIndex={focusable ? 0 : -1}
            data-path={entry.path}
            aria-selected={selected}
            onClick={() => onSelect(entry.path)}
            onDoubleClick={() => onOpen(entry)}
            onContextMenu={onContextMenu}
        >
            <span className='frow__name' role='gridcell'><Icon glyph={KIND_ICON[entry.kind] ?? File} size='sm' /><span>{entry.name}</span></span>
            <span className='frow__size' role='gridcell'>{entrySize(entry)}</span>
            <span className='frow__mod' role='gridcell'>{formatDayTime(entry.modifiedAt, now)}</span>
            <span className='frow__kind' role='gridcell'>{entry.kind}</span>
        </div>
    );
};

export default FinderRow;
