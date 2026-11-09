import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Braces, Check, Play, Square, X } from 'lucide-react';
import { MACHINE_ICON } from '@/modules/machines/utils/machine-labels';
import { RunMenuKind } from '@/modules/run-control/domain/run-control';
import { checkInput, killRun, startRun, stopRun } from '@/modules/run-control/utils/run-actions';
import { chooseMachine } from '@/modules/run-settings/utils/draft-edits';
import { MENU_SEPARATOR, MenuEntry } from '@/shared/contracts/menu';
import { toast } from '@/shared/store/toast';
import { useWorkspaceStore } from '@/shared/store/workspace';

export interface RunMenuContext{
    kind: RunMenuKind;
    stopping: boolean;
    entry: string;
    machines: Machine[];
    machineId: string | null;
}

const activeEntries = (stopping: boolean): MenuEntry[] => [
    { id: 'stop', label: 'Stop after the current step', icon: Square, kbd: 'Ctrl .', disabled: stopping, run: () => void stopRun() },
    { id: 'kill', label: 'Kill now', icon: X, danger: true, run: () => void killRun() }
];

const runOn = (machine: Machine) => {
    chooseMachine(machine);
    toast(`Next run goes to ${machine.name}`);
};

const machineEntry = (machine: Machine, current: boolean): MenuEntry => ({
    id: `machine-${machine.id}`,
    label: current ? `${machine.name} · current` : machine.name,
    icon: MACHINE_ICON[machine.kind],
    disabled: machine.status === 'offline',
    run: () => runOn(machine)
});

const runEntries = ({ entry, machines, machineId }: RunMenuContext): MenuEntry[] => [
    { id: 'run', label: `Run ${entry}`, icon: Play, kbd: 'Ctrl ↵', run: () => void startRun() },
    { id: 'check', label: 'Check input for problems', icon: Check, kbd: 'Ctrl ⇧ K', run: () => void checkInput() },
    { id: 'variables', label: 'Run with different variables…', icon: Braces, run: () => useWorkspaceStore.getState().openPanel('variables') },
    MENU_SEPARATOR,
    { caption: 'Run on' },
    ...machines.map((machine) => machineEntry(machine, machine.id === machineId))
];

export const runMenuEntries = (context: RunMenuContext): MenuEntry[] => {
    if(context.kind === 'active') return activeEntries(context.stopping);

    return runEntries(context);
};
