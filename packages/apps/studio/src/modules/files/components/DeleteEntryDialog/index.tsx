import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import type { FileContext } from '@/modules/files/domain/files';
import { fileErrorCopy } from '@/modules/files/utils/error-messages';
import { deleteEntry } from '@/modules/files/utils/file-actions';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

interface DeleteEntryDialogProps{
    entry: FileEntry;
    context: FileContext;
}

const DeleteEntryDialog = ({ entry, context }: DeleteEntryDialogProps) => (
    <ConfirmDialog
        title={`Delete ${entry.name}?`}
        confirmLabel='Delete'
        onConfirm={() => deleteEntry(entry, context)}
        copy={fileErrorCopy}
    >
        {entry.directory ? `Studio deletes ${entry.path} and everything in it.` : `Studio deletes ${entry.path}.`} This can’t be undone.
    </ConfirmDialog>
);

export default DeleteEntryDialog;
