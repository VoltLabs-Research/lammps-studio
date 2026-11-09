import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Run, RunConfig } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { buildAt } from './fake-builds';

const SECOND = 1000;
const HOUR = 3600 * SECOND;
const DAY = 24 * HOUR;
const SIO2_BUILD_PROGRESS = 0.41;

const START = Date.now();
const at = (offsetMs: number): string => new Date(START - offsetMs).toISOString();

const machine = (patch: Partial<Machine> & Pick<Machine, 'id' | 'name' | 'kind'>): Machine => ({
    status: 'online',
    host: 'localhost',
    os: 'Ubuntu 24.04',
    cpu: '',
    cores: 0,
    memory: '',
    gpus: 0,
    runtime: 'Docker 27.3',
    scheduler: null,
    agentVersion: '0.1.0',
    root: '~/lammps-studio/simulations',
    diskFree: '412 GB',
    offlineSince: null,
    ...patch
});

export const MACHINES: Machine[] = [
    machine({ id: 'local', name: 'This computer', kind: 'local', host: 'rody-workstation', cpu: 'Ryzen 9 7950X', cores: 16, memory: '64 GB' }),
    machine({
        id: 'atlas',
        name: 'atlas',
        kind: 'slurm',
        host: 'rherrera@atlas',
        os: 'Rocky Linux 9.4',
        cpu: '64 nodes',
        cores: 128,
        memory: '512 GB per node',
        gpus: 4,
        runtime: 'Apptainer 1.3',
        scheduler: 'Slurm 23.11 · cpu, gpu, debug',
        root: '/scratch/rherrera/lammps-studio',
        diskFree: '1.8 TB'
    }),
    machine({
        id: 'gpu',
        name: 'gpu-box',
        kind: 'ssh',
        status: 'offline',
        host: 'rody@10.0.4.21',
        os: 'Ubuntu 22.04',
        cpu: 'Threadripper 7960X',
        cores: 24,
        memory: '128 GB',
        gpus: 2,
        runtime: 'Docker 26.1 + NVIDIA toolkit',
        offlineSince: at(3 * HOUR)
    })
];

const simulation = (id: string, name: string, machineId: string, entry: string | null, ageMs: number): Simulation => ({
    id,
    name,
    machineId,
    folder: id,
    entry,
    createdAt: at(ageMs),
    updatedAt: at(0),
    lastRun: null,
    hasPreview: false
});

export const SIMULATIONS: Simulation[] = [
    simulation('cu-nanowire-tension', 'Cu nanowire tension', 'local', 'main.in', 3 * DAY),
    simulation('al-gb-shear', 'Al Σ5 grain boundary shear', 'atlas', 'main.in', 5 * DAY),
    simulation('ni-sintering', 'Ni nanoparticle sintering', 'atlas', 'main.in', 2 * DAY),
    simulation('sio2-melt-quench', 'SiO₂ melt-quench', 'local', 'main.in', DAY),
    simulation('lj-melt', 'LJ melt', 'local', 'in.melt', 4 * DAY),
    simulation('fe-crack', 'Fe crack propagation', 'gpu', 'main.in', 6 * DAY),
    simulation('water-box', 'Water box', 'local', null, 2 * HOUR)
];

export const configFor = (machineId: string, packages: string[]): RunConfig => ({
    machineId,
    version: 'stable',
    packages,
    accelerator: 'omp',
    mpiRanks: 8,
    threadsPerRank: 2,
    gpus: 0,
    slurm: machineId === 'atlas' ? { partition: 'cpu', nodes: 4, time: '12:00:00', account: 'mat-sci' } : null,
    entry: 'main.in',
    variables: {}
});

interface RunSeed{
    simulationId: string;
    machineId: string;
    patch: Partial<Run>;
}

const runOf = ({ simulationId, machineId, patch }: RunSeed): Run => ({
    simulationId,
    number: 1,
    state: 'running',
    startedAt: at(HOUR),
    endedAt: null,
    progress: { step: 0, totalSteps: 500_000, section: 1, sections: 1, stepsPerSecond: null },
    error: null,
    config: configFor(machineId, ['MANYBODY', 'OPENMP']),
    buildHash: '3f9a0c21b7e4',
    outputDir: 'runs/run-1',
    frames: 0,
    warnings: 0,
    ...patch
});

export const RUNS: Run[] = [
    runOf({
        simulationId: 'al-gb-shear',
        machineId: 'atlas',
        patch: { startedAt: at(5.4 * HOUR), progress: { step: 1_260_000, totalSteps: 2_000_000, section: 1, sections: 1, stepsPerSecond: 64.91 } }
    }),
    runOf({ simulationId: 'ni-sintering', machineId: 'atlas', patch: { state: 'queued', startedAt: at(20 * 60 * SECOND) } }),
    runOf({
        simulationId: 'sio2-melt-quench',
        machineId: 'local',
        patch: { state: 'building', startedAt: at(4 * 60 * SECOND), buildHash: 'c47b19d2e530', progress: { step: 0, totalSteps: 300_000, section: 1, sections: 3, stepsPerSecond: null } }
    }),
    runOf({
        simulationId: 'lj-melt',
        machineId: 'local',
        patch: { state: 'completed', startedAt: at(2 * HOUR + 252 * SECOND), endedAt: at(2 * HOUR), progress: { step: 50_000, totalSteps: 50_000, section: 1, sections: 1, stepsPerSecond: 198.4 } }
    }),
    runOf({
        simulationId: 'fe-crack',
        machineId: 'gpu',
        patch: {
            state: 'failed',
            startedAt: at(26 * HOUR),
            endedAt: at(25 * HOUR),
            progress: { step: 61_200, totalSteps: 200_000, section: 1, sections: 1, stepsPerSecond: 17.1 },
            error: { message: 'Lost atoms', step: 61_200, line: 47 }
        }
    })
];

const build = (patch: Partial<Build> & Pick<Build, 'hash' | 'machineId' | 'packages'>): Build => ({
    version: 'stable',
    image: `lammps/lammps-runtime:${patch.hash}`,
    sizeBytes: null,
    status: 'ready',
    progress: 1,
    steps: [],
    output: null,
    buildSeconds: null,
    usedBy: 1,
    createdAt: at(0),
    ...patch
});

export const BUILDS: Build[] = [
    build({ hash: '3f9a0c21b7e4', machineId: 'local', packages: ['MANYBODY', 'OPENMP'], sizeBytes: 1.4e9, buildSeconds: 408, usedBy: 2, createdAt: at(3 * DAY) }),
    build({
        hash: '8d21e6f04a9b',
        machineId: 'atlas',
        packages: ['MANYBODY', 'EXTRA-COMPUTE'],
        image: 'lammps-8d21e6f04a9b.sif',
        sizeBytes: 612e6,
        buildSeconds: 665,
        usedBy: 2,
        createdAt: at(8 * DAY)
    }),
    buildAt(build({
        hash: 'c47b19d2e530',
        machineId: 'local',
        packages: ['KSPACE', 'MOLECULE', 'RIGID'],
        status: 'building',
        createdAt: at(4 * 60 * SECOND)
    }), SIO2_BUILD_PROGRESS),
    build({ hash: '1e0f7a3c9d82', machineId: 'gpu', packages: ['MANYBODY', 'KOKKOS', 'GPU'], sizeBytes: 3.1e9, buildSeconds: 1120, createdAt: at(15 * DAY) }),
    build({ hash: '5b6e2d81f0c4', machineId: 'local', packages: [], sizeBytes: 1.1e9, buildSeconds: 312, createdAt: at(30 * HOUR) })
];
