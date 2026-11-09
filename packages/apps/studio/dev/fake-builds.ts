import { Build, BuildStep, BuildStepState } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { formatInt } from '../src/shared/utils/format';

interface BuildStage{
    name: string;
    start: number;
    end: number;
}

export interface BuildSeed{
    machine: Machine;
    version: string;
    packages: string[];
    hash: string;
    createdAt: string;
    progress: number;
    usedBy: number;
}

const COMPILE_START = 0.32;
const COMPILE_END = 0.96;
const SOURCE_FILES = 1388;
const FILES_PER_SOURCE = 7;
const BUILT_SIZE_BYTES = 1.2e9;
const MS_PER_SECOND = 1000;
const MOCKUP_BUILD_STEP = 0.0045;
const MOCKUP_BUILD_TICK_SECONDS = 0.11;
const CONFIGURE_LINE = 'RUN cmake -S /opt/lammps-src/cmake -B build -DBUILD_MPI=yes …';

const SOURCES = [
    'atom.cpp',
    'pair_eam_alloy.cpp',
    'neighbor.cpp',
    'verlet.cpp',
    'compute_cna_atom.cpp',
    'fix_deform.cpp',
    'pair_eam_omp.cpp',
    'compute_pe_atom.cpp',
    'domain.cpp',
    'comm_brick.cpp',
    'npair_half_bin_newton.cpp',
    'dump_custom.cpp'
];

export const BUILD_PROGRESS_PER_SECOND = MOCKUP_BUILD_STEP / MOCKUP_BUILD_TICK_SECONDS;

const stagesFor = (version: string): BuildStage[] => [
    { name: 'Resolving the build', start: 0, end: 0.03 },
    { name: 'Pulling ubuntu:24.04', start: 0.03, end: 0.08 },
    { name: 'Installing compilers and OpenMPI', start: 0.08, end: 0.18 },
    { name: `Cloning LAMMPS ${version}`, start: 0.18, end: 0.26 },
    { name: 'Configuring with CMake', start: 0.26, end: COMPILE_START },
    { name: 'Compiling', start: COMPILE_START, end: COMPILE_END },
    { name: 'Installing lmp', start: COMPILE_END, end: 1 }
];

const compiledFiles = (progress: number): number => {
    const fraction = Math.min(1, Math.max(0, (progress - COMPILE_START) / (COMPILE_END - COMPILE_START)));

    return Math.round(fraction * SOURCE_FILES);
};

const stateAt = ({ start, end }: BuildStage, progress: number): BuildStepState => {
    if(progress >= end) return 'done';
    if(progress >= start) return 'active';

    return 'pending';
};

const stepAt = (stage: BuildStage, progress: number): BuildStep => {
    const state = stateAt(stage, progress);
    const compiling = stage.start === COMPILE_START && state !== 'pending';

    return {
        name: stage.name,
        state,
        detail: compiling ? `${formatInt(compiledFiles(progress))} of ${formatInt(SOURCE_FILES)} files` : null
    };
};

const outputAt = (progress: number): string => {
    if(progress < COMPILE_START) return CONFIGURE_LINE;

    const source = SOURCES[Math.floor(compiledFiles(progress) / FILES_PER_SOURCE) % SOURCES.length];

    return `Building CXX object src/CMakeFiles/lammps.dir/${source}.o`;
};

export const buildAt = (build: Build, progress: number): Build => ({
    ...build,
    progress,
    steps: stagesFor(build.version).map((stage) => stepAt(stage, progress)),
    output: outputAt(progress)
});

const imageFor = (machine: Machine, hash: string): string => (machine.kind === 'slurm' ? `lammps-${hash}.sif` : `lammps/lammps-runtime:${hash}`);

export const newBuild = ({ machine, version, packages, hash, createdAt, progress, usedBy }: BuildSeed): Build => buildAt({
    hash,
    machineId: machine.id,
    version,
    packages,
    image: imageFor(machine, hash),
    sizeBytes: null,
    status: 'building',
    progress,
    steps: [],
    output: null,
    buildSeconds: null,
    usedBy,
    createdAt
}, progress);

export const advanceBuild = (build: Build, by: number, now: number): Build => {
    const progress = Math.min(1, build.progress + by);
    const next = buildAt(build, progress);
    if(progress < 1) return next;

    return {
        ...next,
        status: 'ready',
        sizeBytes: BUILT_SIZE_BYTES,
        buildSeconds: (now - Date.parse(build.createdAt)) / MS_PER_SECOND
    };
};

const samePackages = (a: string[], b: string[]): boolean => a.length === b.length && a.every((name) => b.includes(name));

export const buildMatching = (builds: Build[], machineId: string, version: string, packages: string[]): Build | null =>
    builds.find((build) => build.status !== 'failed' && build.machineId === machineId && build.version === version && samePackages(build.packages, packages)) ?? null;
