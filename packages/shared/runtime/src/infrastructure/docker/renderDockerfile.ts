import Build from '../../domain/build/Build';
import type { BuildStage } from '../../domain/build/BuildStage';

const LAMMPS_REPOSITORY = 'https://github.com/lammps/lammps.git';
const UBUNTU_IMAGE = 'ubuntu:24.04';
const CUDA_IMAGE = 'nvidia/cuda:12.8.1-devel-ubuntu24.04';
const SOURCE_DIR = '/opt/lammps';
const BUILD_DIR = '/opt/lammps/build';
const INSTALL_PREFIX = '/usr/local';

export const CONTAINER_SIMULATION_DIR = '/simulation';

const TOOLCHAIN_PACKAGES = ['build-essential', 'ca-certificates', 'cmake', 'git', 'libopenmpi-dev', 'openmpi-bin'];

const THREADED_PACKAGES = ['OPENMP', 'KOKKOS'];

interface PackageRecipe{
    apt: string[];
    cmake: string[];
}

const PACKAGE_RECIPES: Record<string, PackageRecipe> = {
    KSPACE: { apt: ['libfftw3-dev'], cmake: [] },
    VORONOI: { apt: [], cmake: ['-DDOWNLOAD_VORO=yes'] },
    KOKKOS: { apt: [], cmake: ['-DKokkos_ENABLE_SERIAL=yes', '-DKokkos_ENABLE_OPENMP=yes'] },
    GPU: { apt: [], cmake: ['-DGPU_API=cuda'] },
    INTEL: { apt: [], cmake: ['-DINTEL_ARCH=cpu'] }
};

interface DockerfileStep{
    stage: BuildStage;
    instruction: string;
}

export interface RenderedDockerfile{
    text: string;
    stages: BuildStage[];
}

const shellEscape = (value: string): string => {
    return `'${value.replace(/'/g, `'\\''`)}'`;
};

const recipesOf = (build: Build): PackageRecipe[] => {
    return build.packages.flatMap((name) => PACKAGE_RECIPES[name] ?? []);
};

const aptPackages = (build: Build): string[] => {
    return [...new Set([...TOOLCHAIN_PACKAGES, ...recipesOf(build).flatMap((recipe) => recipe.apt)])];
};

export const cmakeArguments = (build: Build): string[] => {
    const threaded = THREADED_PACKAGES.some((name) => build.has(name));

    return [
        '-DCMAKE_BUILD_TYPE=Release',
        `-DCMAKE_INSTALL_PREFIX=${INSTALL_PREFIX}`,
        '-DBUILD_MPI=yes',
        `-DBUILD_OMP=${threaded ? 'yes' : 'no'}`,
        ...build.packages.map((name) => `-DPKG_${name}=yes`),
        ...recipesOf(build).flatMap((recipe) => recipe.cmake)
    ];
};

const steps = (build: Build): DockerfileStep[] => {
    const apt = aptPackages(build).join(' ');
    const cmake = cmakeArguments(build).map(shellEscape).join(' ');

    return [
        { stage: 'pull', instruction: `FROM ${build.has('GPU') ? CUDA_IMAGE : UBUNTU_IMAGE}` },
        { stage: 'toolchain', instruction: `RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ${apt} && rm -rf /var/lib/apt/lists/*` },
        { stage: 'clone', instruction: `RUN git clone --depth 1 --branch ${shellEscape(build.version)} ${LAMMPS_REPOSITORY} ${SOURCE_DIR}` },
        { stage: 'configure', instruction: `RUN cmake -S ${SOURCE_DIR}/cmake -B ${BUILD_DIR} ${cmake}` },
        { stage: 'compile', instruction: `RUN cmake --build ${BUILD_DIR} --parallel "$(nproc)" && cmake --install ${BUILD_DIR} && rm -rf ${SOURCE_DIR}` },
        { stage: 'install', instruction: `WORKDIR ${CONTAINER_SIMULATION_DIR}` }
    ];
};

export const renderDockerfile = (build: Build): RenderedDockerfile => {
    const rendered = steps(build);

    return {
        text: `${rendered.map((step) => step.instruction).join('\n')}\n`,
        stages: rendered.map((step) => step.stage)
    };
};
