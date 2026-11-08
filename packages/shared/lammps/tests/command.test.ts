import { describe, expect, it } from 'vitest';
import type { RunConfig } from '@lammps-studio/contracts/run/domain';
import { runCommand } from '../src/command/run-command';
import { ACCELERATORS } from '../src/catalog/accelerators';
import { PACKAGES } from '../src/catalog/packages';
import { LAMMPS_VERSIONS } from '../src/catalog/versions';

const LOCAL: RunConfig = {
    machineId: 'local',
    version: 'stable_22Jul2025_update1',
    packages: ['MANYBODY', 'OPENMP'],
    accelerator: 'omp',
    mpiRanks: 8,
    threadsPerRank: 2,
    gpus: 0,
    slurm: null,
    entry: 'main.in',
    variables: {}
};

const config = (overrides: Partial<RunConfig>): RunConfig => ({ ...LOCAL, ...overrides });

describe('runCommand', () => {
    it.each([
        ['OpenMP', config({}), 'OMP_NUM_THREADS=2 mpirun -np 8 lmp -in main.in -sf omp -pk omp 2'],
        ['Kokkos', config({ accelerator: 'kokkos', threadsPerRank: 4 }), 'OMP_NUM_THREADS=4 mpirun -np 8 lmp -in main.in -k on t 4 -sf kk'],
        ['GPU', config({ accelerator: 'gpu', gpus: 2 }), 'mpirun -np 8 lmp -in main.in -sf gpu -pk gpu 2'],
        ['GPU with no GPUs picked yet', config({ accelerator: 'gpu', gpus: 0 }), 'mpirun -np 8 lmp -in main.in -sf gpu -pk gpu 1'],
        ['Intel', config({ accelerator: 'intel' }), 'mpirun -np 8 lmp -in main.in -sf intel'],
        ['Opt', config({ accelerator: 'opt' }), 'mpirun -np 8 lmp -in main.in -sf opt'],
        ['no acceleration', config({ accelerator: 'none', mpiRanks: 4 }), 'mpirun -np 4 lmp -in main.in'],
        ['overrides', config({ variables: { T: '400', erate: '', seed: '7' } }), 'OMP_NUM_THREADS=2 mpirun -np 8 lmp -in main.in -sf omp -pk omp 2 -var T 400 -var seed 7'],
        ['another entry', config({ accelerator: 'none', entry: 'water.lmp' }), 'mpirun -np 8 lmp -in water.lmp']
    ])('previews a local %s run', (_, run, expected) => {
        expect(runCommand(run, '3f9a0c21b7e4')).toBe(expected);
    });

    it('previews a Slurm job running the Apptainer image of the build', () => {
        const run = config({
            machineId: 'atlas',
            packages: ['EXTRA-COMPUTE', 'MANYBODY'],
            accelerator: 'none',
            slurm: { partition: 'cpu', nodes: 1, time: '04:00:00', account: 'mat-sim' },
            variables: { T: '350' }
        });

        expect(runCommand(run, '8d21e6f04a9b')).toBe(
            'sbatch -p cpu -N 1 -t 04:00:00 -A mat-sim\n  srun apptainer exec lammps-8d21e6f04a9b.sif \\\n  lmp -in main.in -var T 350'
        );
    });

    it('names the image lammps-new.sif while the build does not exist yet', () => {
        const run = config({ slurm: { partition: 'gpu', nodes: 4, time: '12:00:00', account: 'mat-sim' } });

        expect(runCommand(run, null)).toBe(
            'sbatch -p gpu -N 4 -t 12:00:00 -A mat-sim\n  srun apptainer exec lammps-new.sif \\\n  lmp -in main.in -sf omp -pk omp 2'
        );
    });
});

describe('the catalog', () => {
    it('offers the physics and acceleration packages of the build picker', () => {
        expect(PACKAGES.filter((entry) => entry.group === 'physics').map((entry) => entry.name)).toEqual([
            'MANYBODY', 'KSPACE', 'MOLECULE', 'RIGID', 'EXTRA-COMPUTE', 'EXTRA-FIX', 'EXTRA-PAIR', 'REAXFF', 'ML-SNAP', 'MC', 'VORONOI', 'REPLICA'
        ]);
        expect(PACKAGES.filter((entry) => entry.group === 'accel').map((entry) => entry.name)).toEqual(['OPENMP', 'KOKKOS', 'GPU', 'INTEL', 'OPT']);
    });

    it('ties every accelerator except none to a package from the catalog', () => {
        const accelPackages = PACKAGES.filter((entry) => entry.group === 'accel').map((entry) => entry.name);

        expect(ACCELERATORS.map((entry) => entry.id)).toEqual(['none', 'omp', 'kokkos', 'gpu', 'intel', 'opt']);
        expect(ACCELERATORS.filter((entry) => entry.package !== null).map((entry) => entry.package)).toEqual(accelPackages);
    });

    it('maps each offered version to a pinned git ref', () => {
        expect(LAMMPS_VERSIONS).toEqual([
            { ref: 'stable_22Jul2025_update1', label: 'stable · 22 Jul 2025 · Update 1' },
            { ref: 'stable_29Aug2024', label: 'stable · 29 Aug 2024' },
            { ref: 'develop', label: 'develop' }
        ]);
    });
});
