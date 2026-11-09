import { Camera, ChartLine, Check, Braces, Package, Play, Square, SquareTerminal } from 'lucide-react';
import { Command } from '@/modules/palette/contracts/command';
import { checkInput, startRun, stopRun } from '@/modules/run-control/utils/run-actions';
import { saveViewportImage } from '@/modules/viewport/utils/viewport-shot';
import { PanelId } from '@/shared/contracts/workspace';
import { useWorkspaceStore } from '@/shared/store/workspace';

const open = (panel: PanelId) => () => useWorkspaceStore.getState().openPanel(panel);

export const WORKSPACE_COMMANDS: Command[] = [
    { id: 'run', label: 'Run simulation', icon: Play, kbd: 'Ctrl Enter', run: () => void startRun() },
    { id: 'stop', label: 'Stop after the current step', icon: Square, kbd: 'Ctrl .', run: () => void stopRun() },
    { id: 'check', label: 'Check input for problems', icon: Check, kbd: 'Ctrl ⇧ K', run: () => void checkInput() },
    { id: 'variables', label: 'Set variables for the next run', icon: Braces, kbd: 'Ctrl ⇧ V', run: open('variables') },
    { id: 'output', label: 'Show output', icon: SquareTerminal, kbd: 'Ctrl ⇧ L', run: open('output') },
    { id: 'charts', label: 'Show charts', icon: ChartLine, kbd: 'Ctrl ⇧ C', run: open('charts') },
    { id: 'save-image', label: 'Save image of the viewport', icon: Camera, run: () => void saveViewportImage() },
    { id: 'packages', label: 'Change packages for this build', icon: Package, run: open('config') }
];
