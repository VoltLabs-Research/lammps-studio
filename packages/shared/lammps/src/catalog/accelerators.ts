import type { Accelerator } from '@lammps-studio/contracts/run/domain';

export interface AcceleratorOption{
    id: Accelerator;
    label: string;
    package: string | null;
}

export const ACCELERATORS: AcceleratorOption[] = [
    { id: 'none', label: 'None', package: null },
    { id: 'omp', label: 'OpenMP', package: 'OPENMP' },
    { id: 'kokkos', label: 'Kokkos', package: 'KOKKOS' },
    { id: 'gpu', label: 'GPU', package: 'GPU' },
    { id: 'intel', label: 'Intel', package: 'INTEL' },
    { id: 'opt', label: 'Opt', package: 'OPT' }
];

const THREADED: Accelerator[] = ['omp', 'kokkos'];

export const usesThreads = (accelerator: Accelerator): boolean => {
    return THREADED.includes(accelerator);
};

export const acceleratorArgs = (accelerator: Accelerator, threads: number, gpus: number): string[] => {
    const args: Record<Accelerator, string[]> = {
        none: [],
        omp: ['-sf', 'omp', '-pk', 'omp', String(threads)],
        kokkos: ['-k', 'on', 't', String(threads), '-sf', 'kk'],
        gpu: ['-sf', 'gpu', '-pk', 'gpu', String(Math.max(gpus, 1))],
        intel: ['-sf', 'intel'],
        opt: ['-sf', 'opt']
    };

    return args[accelerator];
};
