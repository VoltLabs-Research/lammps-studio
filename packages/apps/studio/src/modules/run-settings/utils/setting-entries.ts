import { Accelerator } from '@lammps-studio/contracts/run/domain';
import { EntryCandidate } from '@lammps-studio/contracts/script/domain';
import { ACCELERATORS } from '@lammps-studio/lammps/catalog/accelerators';
import { PACKAGES } from '@lammps-studio/lammps/catalog/packages';
import { LAMMPS_VERSIONS } from '@lammps-studio/lammps/catalog/versions';
import { isAcceleratorPackage } from '@/modules/run-settings/utils/draft-packages';
import { MENU_SEPARATOR, MenuEntry } from '@/shared/contracts/menu';

export interface PackageChoice{
    selected: string[];
    required: string[];
    entry: string;
    toggle: (name: string) => void;
}

const INPUT_SCRIPT = /(^|\/)in\.[^/]+$|\.(in|lmp|lammps)$/;

export const versionLabel = (ref: string): string => LAMMPS_VERSIONS.find((version) => version.ref === ref)?.label ?? ref;

export const versionEntries = (current: string, choose: (ref: string) => void): MenuEntry[] =>
    LAMMPS_VERSIONS.map((version) => ({
        id: version.ref,
        label: version.label,
        checked: version.ref === current,
        run: () => choose(version.ref)
    }));

export const packageEntries = ({ selected, required, entry, toggle }: PackageChoice): MenuEntry[] => {
    const catalog = PACKAGES.filter((pkg) => pkg.group === 'physics').map((pkg) => ({ name: pkg.name, hint: pkg.hint }));
    const extra = selected.filter((name) => !isAcceleratorPackage(name) && !catalog.some((pkg) => pkg.name === name)).map((name) => ({ name, hint: '' }));

    return [...catalog, ...extra].map(({ name, hint }) => {
        const needed = required.includes(name);

        return {
            id: name,
            label: name,
            hint: needed ? `${entry} needs it` : hint,
            checked: needed || selected.includes(name),
            disabled: needed,
            keepOpen: true,
            run: () => toggle(name)
        };
    });
};

export const acceleratorEntries = (current: Accelerator, choose: (accelerator: Accelerator) => void): MenuEntry[] =>
    ACCELERATORS.map((option) => ({
        id: option.id,
        label: option.label,
        hint: option.package ? `${option.package} package` : undefined,
        checked: option.id === current,
        run: () => choose(option.id)
    }));

export const partitionEntries = (partitions: string[], current: string, choose: (partition: string) => void): MenuEntry[] =>
    partitions.map((partition) => ({
        id: partition,
        label: partition,
        checked: partition === current,
        run: () => choose(partition)
    }));

const isInputScript = (path: string): boolean => INPUT_SCRIPT.test(path);

export const entryEntries = (candidates: EntryCandidate[], current: string | null, choose: (path: string) => void, other: () => void): MenuEntry[] => {
    const scripts = candidates.map((candidate) => candidate.path).filter(isInputScript);
    const paths = current === null || scripts.includes(current) ? scripts : [current, ...scripts];

    return [
        ...paths.map((path) => ({ id: path, label: path, checked: path === current, run: () => choose(path) })),
        MENU_SEPARATOR,
        { id: 'other', label: 'Choose another file…', run: other }
    ];
};
