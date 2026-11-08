export interface FileEntry{
    name: string;
    path: string;
    directory: boolean;
    sizeBytes: number | null;
    items: number | null;
    modifiedAt: string;
    kind: string;
}

export interface FileQuery{
    path: string;
}
