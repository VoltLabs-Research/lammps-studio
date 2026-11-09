export type WorkspaceKey = 'run' | 'stop' | 'check' | 'output' | 'charts' | 'variables' | 'previous-frame' | 'next-frame';

export interface KeyChord{
    key: string;
    mod: boolean;
    shift: boolean;
    alt: boolean;
    inControl: boolean;
}
