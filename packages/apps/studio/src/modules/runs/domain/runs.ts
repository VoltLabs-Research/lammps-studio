export type RunRowStatus =
    | { kind: 'progress'; fraction: number }
    | { kind: 'word'; word: string; danger: boolean };

export interface RunRowModel{
    number: number;
    sub: string;
    status: RunRowStatus;
    disabled: boolean;
    folder: string;
}

export interface RunGroupModel{
    title: string;
    rows: RunRowModel[];
}

export interface RunListContext{
    now: number;
    buildProgress: (hash: string) => number | null;
}
