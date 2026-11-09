import { Braces, ChartLine, Files, Folder, History, LucideIcon, Package, SquareTerminal } from 'lucide-react';
import { PanelId } from '@/shared/contracts/workspace';

export interface ActivityEntry{
    panel: PanelId;
    label: string;
    tip: string;
    icon: LucideIcon;
}

export const ACTIVITY: ActivityEntry[] = [
    { panel: 'editor', label: 'Editor', tip: 'Editor · VS Code', icon: Files },
    { panel: 'output', label: 'Output', tip: 'Output · Ctrl+Shift+L', icon: SquareTerminal },
    { panel: 'charts', label: 'Charts', tip: 'Charts · Ctrl+Shift+C', icon: ChartLine },
    { panel: 'variables', label: 'Variables', tip: 'Variables, computes and fixes', icon: Braces },
    { panel: 'files', label: 'Files', tip: 'Files', icon: Folder },
    { panel: 'runs', label: 'Runs', tip: 'Runs', icon: History },
    { panel: 'config', label: 'Build and run settings', tip: 'Build and run settings', icon: Package }
];
