import { LucideIcon } from 'lucide-react';
import { BuildStepState } from '@lammps-studio/contracts/build/domain';
import { RunState } from '@lammps-studio/contracts/run/domain';
import { ButtonVariant } from '@/shared/contracts/ui';
import { PanelId } from '@/shared/contracts/workspace';

export type RunPhase = 'noscript' | 'idle' | RunState;

export type OverlayKind = 'picker' | 'idle' | 'building' | 'starting';

export interface RunFolder{
    simulationId: string;
    number: number;
    outputDir: string;
}

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

export interface BuildLine{
    name: string;
    label: string;
    state: BuildStepState;
}

export interface BuildProgressModel{
    sub: string;
    progress: number;
    now: string;
    steps: BuildLine[];
    output: string | null;
}
