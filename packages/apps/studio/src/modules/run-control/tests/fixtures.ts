import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Run, RunConfig, RunState } from '@lammps-studio/contracts/run/domain';
import { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';

export const NOW = Date.parse('2026-11-08T12:00:00.000Z');

export const simulationFixture = (patch: Partial<Simulation> = {}): Simulation => ({
    id: 'cu',
    name: 'Cu nanowire tension',
    machineId: 'local',
    folder: 'cu-nanowire-tension',
    entry: 'main.in',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-08T10:00:00.000Z',
    lastRun: null,
    hasPreview: false,
    ...patch
});

export const configFixture = (patch: Partial<RunConfig> = {}): RunConfig => ({
    machineId: 'local',
    version: 'stable_22Jul2025_update1',
    packages: ['MANYBODY', 'OPENMP'],
    accelerator: 'omp',
    mpiRanks: 8,
    threadsPerRank: 2,
    gpus: 0,
    slurm: null,
    entry: 'main.in',
    variables: {},
    ...patch
});

export const runFixture = (state: RunState, patch: Partial<Run> = {}): Run => ({
    simulationId: 'cu',
    number: 3,
    state,
    startedAt: '2026-11-08T11:40:00.000Z',
    endedAt: null,
    progress: { step: 184_000, totalSteps: 500_000, section: 2, sections: 2, stepsPerSecond: 640.82 },
    error: null,
    config: configFixture(),
    buildHash: '3f9a0c21b7e4',
    outputDir: 'runs/run-3',
    frames: 93,
    warnings: 2,
    ...patch
});

export const machineFixture = (patch: Partial<Machine> = {}): Machine => ({
    id: 'local',
    name: 'This computer',
    kind: 'local',
    status: 'online',
    host: 'rody-workstation',
    os: 'Ubuntu 24.04',
    cpu: 'Ryzen 9 7950X',
    cores: 16,
    memory: '64 GB',
    gpus: 0,
    runtime: 'Docker 27.3',
    scheduler: null,
    agentVersion: '0.1.0',
    root: '~/lammps-studio/simulations',
    diskFree: '412 GB',
    offlineSince: null,
    ...patch
});

export const buildFixture = (patch: Partial<Build> = {}): Build => ({
    hash: '3f9a0c21b7e4',
    machineId: 'local',
    version: 'stable_22Jul2025_update1',
    packages: ['MANYBODY', 'OPENMP'],
    image: 'lammps/lammps-runtime:3f9a0c21b7e4',
    sizeBytes: 1_400_000_000,
    status: 'ready',
    progress: 1,
    steps: [],
    output: null,
    buildSeconds: 408,
    usedBy: 2,
    createdAt: '2026-11-05T10:00:00.000Z',
    ...patch
});

export const scriptFixture = (patch: Partial<ScriptInfo> = {}): ScriptInfo => ({
    entry: 'main.in',
    lines: 52,
    variables: [],
    computes: [],
    fixes: [],
    dumps: [],
    runs: [{ line: 40, steps: 20_000 }, { line: 52, steps: 500_000 }],
    requiredPackages: [{ name: 'MANYBODY', reason: 'pair_style eam/alloy', line: 12 }],
    thermoEvery: 1000,
    units: 'metal',
    ...patch
});
