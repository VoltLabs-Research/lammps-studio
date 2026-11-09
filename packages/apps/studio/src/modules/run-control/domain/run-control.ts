import { LucideIcon } from 'lucide-react';
import { RunState } from '@lammps-studio/contracts/run/domain';
import { ButtonVariant } from '@/shared/contracts/ui';
import { PanelId } from '@/shared/contracts/workspace';

export type RunPhase = 'noscript' | 'idle' | RunState;

export type RunChipTone = 'neutral' | 'warn' | 'danger';

export interface RunChipModel{
    label: string;
    meta: string;
    tone: RunChipTone;
    jump: PanelId;
}

export type RunAction = 'run' | 'stop';

export type RunMenuKind = 'run' | 'active';

export interface RunButtonModel{
    label: string;
    variant: ButtonVariant;
    icon: LucideIcon;
    spin: boolean;
    action: RunAction | null;
    tip: string | null;
    menu: RunMenuKind | null;
}

export interface StatusItem{
    key: string;
    text: string;
    icon: LucideIcon | null;
    mono: boolean;
    spin: boolean;
    wideOnly: boolean;
}

export interface Statusbar{
    left: StatusItem[];
    status: StatusItem[];
    entry: StatusItem;
}
