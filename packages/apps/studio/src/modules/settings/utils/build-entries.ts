import { Machine } from '@lammps-studio/contracts/machine/domain';
import { MACHINE_KIND_LABEL } from '@/modules/machines/utils/machine-labels';
import { PACKAGES } from '@/modules/settings/utils/package-catalog';
import { MENU_SEPARATOR, MenuEntry } from '@/shared/contracts/menu';

export const machineEntries = (machines: Machine[], machineId: string | null, choose: (machineId: string) => void): MenuEntry[] =>
    machines.map((machine) => ({
        id: machine.id,
        label: machine.name,
        hint: machine.status === 'offline' ? 'Offline' : MACHINE_KIND_LABEL[machine.kind],
        checked: machine.id === machineId,
        disabled: machine.status === 'offline',
        run: () => choose(machine.id)
    }));

export const packageEntries = (selected: string[], toggle: (name: string) => void): MenuEntry[] => {
    const entryOf = (name: string, hint: string): MenuEntry => ({
        id: name,
        label: name,
        hint,
        checked: selected.includes(name),
        keepOpen: true,
        run: () => toggle(name)
    });
    const physics = PACKAGES.filter((pkg) => pkg.group === 'physics').map((pkg) => entryOf(pkg.name, pkg.hint));
    const accelerators = PACKAGES.filter((pkg) => pkg.group === 'accel').map((pkg) => entryOf(pkg.name, pkg.hint));

    return [...physics, MENU_SEPARATOR, ...accelerators];
};

export const toggledPackages = (selected: string[], name: string): string[] => {
    const next = selected.includes(name) ? selected.filter((other) => other !== name) : [...selected, name];

    return PACKAGES.map((pkg) => pkg.name).filter((other) => next.includes(other));
};
