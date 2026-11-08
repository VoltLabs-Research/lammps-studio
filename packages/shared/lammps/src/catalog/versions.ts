export interface LammpsVersion{
    ref: string;
    label: string;
}

export const LAMMPS_VERSIONS: LammpsVersion[] = [
    { ref: 'stable_22Jul2025_update1', label: 'stable · 22 Jul 2025 · Update 1' },
    { ref: 'stable_29Aug2024', label: 'stable · 29 Aug 2024' },
    { ref: 'develop', label: 'develop' }
];
