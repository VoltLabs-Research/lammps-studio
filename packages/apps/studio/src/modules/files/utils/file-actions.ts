import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import { fileRoutes } from '@lammps-studio/contracts/file/routes';
import type { FileContext } from '@/modules/files/domain/files';
import { openFolder, refreshFolder } from '@/modules/files/store/folder';
import { fileErrorCopy } from '@/modules/files/utils/error-messages';
import { fileTarget, fullPath, runOwning } from '@/modules/files/utils/finder';
import { call } from '@/shared/api/call';
import { copyText } from '@/shared/services/clipboard';
import { saveBlob } from '@/shared/services/save-file';
import { usePreferencesStore } from '@/shared/store/preferences';
import { selectRun } from '@/shared/store/run-session';
import { toast } from '@/shared/store/toast';
import { useWorkspaceStore } from '@/shared/store/workspace';

export const copyEntryPath = (entry: FileEntry, { folder }: FileContext) => copyText(fullPath(folder, entry.path), 'Copied the path');

export const downloadEntry = async (entry: FileEntry, { simulationId }: FileContext) => {
    try{
        const bytes = await call(fileRoutes.download, { path: { simulationId }, query: { path: entry.path } });
        saveBlob(new Blob([bytes]), entry.name);
    }catch(error){
        toast(fileErrorCopy(error));
    }
};

export const deleteEntry = async (entry: FileEntry, { simulationId }: FileContext) => {
    await call(fileRoutes.remove, { path: { simulationId }, query: { path: entry.path } });
    await refreshFolder();
};

const viewRunOf = (entry: FileEntry, context: FileContext) => {
    const run = runOwning(entry.path, context.runs);
    if(run) void selectRun(run.number);
};

const openInEditor = (entry: FileEntry, context: FileContext) => {
    if(usePreferencesStore.getState().editor === 'studio'){
        useWorkspaceStore.getState().openPanel('editor');
        return;
    }

    void copyText(fullPath(context.folder, entry.path), `Copied the path to ${entry.name}`);
};

export const showInOutput = (entry: FileEntry, context: FileContext) => {
    viewRunOf(entry, context);
    useWorkspaceStore.getState().openPanel('output');
};

export const openEntry = (entry: FileEntry, context: FileContext) => {
    switch(fileTarget(entry, context.runs)){
        case 'folder':
            void openFolder(context.simulationId, entry.path);
            return;
        case 'output':
            showInOutput(entry, context);
            return;
        case 'viewport':
            viewRunOf(entry, context);
            toast(`The viewport is reading ${entry.name}`);
            return;
        case 'editor':
            openInEditor(entry, context);
            return;
        case 'download':
            void downloadEntry(entry, context);
    }
};
