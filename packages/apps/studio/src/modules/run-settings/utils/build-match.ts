import { Build } from '@lammps-studio/contracts/build/domain';
import { RunConfig } from '@lammps-studio/contracts/run/domain';

const SECONDS_PER_MINUTE = 60;

const samePackages = (a: string[], b: string[]): boolean => {
    if(a.length !== b.length) return false;

    const sorted = [...b].sort();

    return [...a].sort().every((name, index) => name === sorted[index]);
};

export const buildFor = (builds: Build[], config: RunConfig): Build | null => {
    const match = builds.find((build) => build.machineId === config.machineId
        && build.version === config.version
        && build.status !== 'failed'
        && samePackages(build.packages, config.packages));

    return match ?? null;
};

export const typicalBuildMinutes = (builds: Build[], machineId: string): number | null => {
    const seconds = builds
        .filter((build) => build.machineId === machineId && build.status === 'ready')
        .flatMap((build) => (build.buildSeconds === null ? [] : [build.buildSeconds]));
    if(seconds.length === 0) return null;

    const mean = seconds.reduce((sum, value) => sum + value, 0) / seconds.length;

    return Math.max(1, Math.round(mean / SECONDS_PER_MINUTE));
};
