import type { FileEntry } from '@lammps-studio/contracts/file/domain';
import type { Run } from '@lammps-studio/contracts/run/domain';
import type { LoadStatus } from '@/shared/store/list-store';

export type FileTarget = 'folder' | 'output' | 'viewport' | 'editor' | 'download';

export interface FileContext{
    simulationId: string;
    folder: string;
    runs: Run[];
}

export interface Crumb{
    label: string;
    path: string;
}

export interface FinderKey{
    key: string;
    command: boolean;
}

export type FinderKeyAction =
    | { kind: 'select'; path: string }
    | { kind: 'open' }
    | { kind: 'parent' };

export interface FolderState{
    simulationId: string | null;
    path: string;
    entries: FileEntry[];
    status: LoadStatus;
    error: unknown;
    selected: string | null;
}
