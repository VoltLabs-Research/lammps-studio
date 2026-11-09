import { Accelerator } from '@lammps-studio/contracts/run/domain';
import { ACCELERATORS } from '@lammps-studio/lammps/catalog/accelerators';
import { PACKAGES } from '@lammps-studio/lammps/catalog/packages';

const CATALOG = PACKAGES.map((pkg) => pkg.name);

const ACCELERATOR_PACKAGES = ACCELERATORS.flatMap((option) => (option.package === null ? [] : [option.package]));

export const isAcceleratorPackage = (name: string): boolean => ACCELERATOR_PACKAGES.includes(name);

export const orderedPackages = (names: string[]): string[] => {
    const known = CATALOG.filter((name) => names.includes(name));
    const unknown = names.filter((name) => !CATALOG.includes(name));

    return [...known, ...unknown];
};

export const withAccelerator = (packages: string[], accelerator: Accelerator): string[] => {
    const physics = packages.filter((name) => !isAcceleratorPackage(name));
    const extra = ACCELERATORS.find((option) => option.id === accelerator)?.package ?? null;

    return extra === null ? physics : [...physics, extra];
};

export const toggledPackage = (packages: string[], name: string): string[] => {
    if(packages.includes(name)) return packages.filter((other) => other !== name);

    return orderedPackages([...packages, name]);
};

export const physicsPackages = (packages: string[]): string[] => packages.filter((name) => !isAcceleratorPackage(name));

export const withRequired = (packages: string[], required: string[]): string[] => {
    const missing = required.filter((name) => !packages.includes(name));
    if(missing.length === 0) return packages;

    return orderedPackages([...packages, ...missing]);
};
