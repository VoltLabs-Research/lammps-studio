import { Atom, Layers, Palette, Plus, Settings } from 'lucide-react';
import { MACHINE_ICON } from '@/modules/machines/utils/machine-labels';
import { Command } from '@/modules/palette/contracts/command';
import { openSettings } from '@/modules/settings/utils/open-settings';
import { useFiltersStore } from '@/modules/simulations/store/filters';
import { openNewSimulation } from '@/modules/simulations/utils/open-new-simulation';
import { useMachines } from '@/shared/hooks/use-machines';
import { useNavigationStore } from '@/shared/store/navigation';
import { isDark, useThemeStore } from '@/shared/store/theme';

const showSimulations = (machineId: string | null) => {
    useNavigationStore.getState().openDashboard();
    if(machineId === null){
        useFiltersStore.getState().showAllMachines();
        return;
    }

    useFiltersStore.getState().showMachine(machineId);
};

const switchTheme = () => {
    const { choice, choose } = useThemeStore.getState();
    choose(isDark(choice) ? 'light' : 'dark');
};

export const useDashboardCommands = (): Command[] => {
    const machines = useMachines();

    return [
        { id: 'new-simulation', label: 'New simulation', icon: Plus, run: openNewSimulation },
        { id: 'simulations', label: 'Go to simulations', icon: Atom, run: () => showSimulations(null) },
        ...machines.map((machine) => ({
            id: `machine-${machine.id}`,
            label: `Show simulations on ${machine.name}`,
            icon: MACHINE_ICON[machine.kind],
            run: () => showSimulations(machine.id)
        })),
        { id: 'builds', label: 'Show builds', icon: Layers, run: () => openSettings('builds') },
        { id: 'settings', label: 'Open settings', icon: Settings, run: () => openSettings('general') },
        { id: 'theme', label: 'Switch between light and dark', icon: Palette, run: switchTheme }
    ];
};
