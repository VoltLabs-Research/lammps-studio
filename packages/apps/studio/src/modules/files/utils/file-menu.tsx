import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import DeleteEntryDialog from '@/modules/files/components/DeleteEntryDialog';
import type { FileContext } from '@/modules/files/domain/files';
import { copyEntryPath, downloadEntry, openEntry, showInOutput } from '@/modules/files/utils/file-actions';
import { fileTarget } from '@/modules/files/utils/finder';
import { MENU_SEPARATOR, MenuEntry } from '@/shared/contracts/menu';
import { openModal } from '@/shared/store/modal';

export const fileMenuEntries = (entry: FileEntry, context: FileContext): MenuEntry[] => {
    const entries: MenuEntry[] = [{ id: 'open', label: 'Open', run: () => openEntry(entry, context) }];
    if(fileTarget(entry, context.runs) === 'output') entries.push({ id: 'output', label: 'Show in Output', run: () => showInOutput(entry, context) });

    entries.push(MENU_SEPARATOR, { id: 'copy', label: 'Copy path', run: () => void copyEntryPath(entry, context) });
    if(!entry.directory) entries.push({ id: 'download', label: 'Download', run: () => void downloadEntry(entry, context) });

    entries.push(MENU_SEPARATOR, {
        id: 'delete',
        label: 'Delete…',
        danger: true,
        run: () => openModal('delete-entry', <DeleteEntryDialog entry={entry} context={context} />)
    });

    return entries;
};
