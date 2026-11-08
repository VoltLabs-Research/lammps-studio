export type PackageGroup = 'physics' | 'accel';

export interface LammpsPackage{
    name: string;
    group: PackageGroup;
    hint: string;
}

export const LAMMPS_VERSION = 'stable';

export const PACKAGES: readonly LammpsPackage[] = [
    { name: 'MANYBODY', group: 'physics', hint: 'eam, tersoff, sw' },
    { name: 'KSPACE', group: 'physics', hint: 'pppm, ewald' },
    { name: 'MOLECULE', group: 'physics', hint: 'bonds, angles' },
    { name: 'RIGID', group: 'physics', hint: 'rigid bodies, shake' },
    { name: 'EXTRA-COMPUTE', group: 'physics', hint: 'extra computes' },
    { name: 'EXTRA-FIX', group: 'physics', hint: 'extra fixes' },
    { name: 'EXTRA-PAIR', group: 'physics', hint: 'extra pair styles' },
    { name: 'REAXFF', group: 'physics', hint: 'reactive force field' },
    { name: 'ML-SNAP', group: 'physics', hint: 'SNAP potentials' },
    { name: 'MC', group: 'physics', hint: 'Monte Carlo' },
    { name: 'VORONOI', group: 'physics', hint: 'needs voro++' },
    { name: 'REPLICA', group: 'physics', hint: 'NEB, PRD' },
    { name: 'OPENMP', group: 'accel', hint: '-sf omp' },
    { name: 'KOKKOS', group: 'accel', hint: '-k on' },
    { name: 'GPU', group: 'accel', hint: '-sf gpu' },
    { name: 'INTEL', group: 'accel', hint: '-sf intel' },
    { name: 'OPT', group: 'accel', hint: '-sf opt' }
];
