import crypto from 'node:crypto';
import { BuildSpec, ResolvedBuildSpec } from './BuildSpec';

const DEFAULT_REPOSITORY = 'https://github.com/lammps/lammps.git';
const DEFAULT_IMAGE_REPOSITORY = 'lammps/lammps-runtime';
const DEFAULT_BASE_IMAGE = 'ubuntu:24.04';
const HASH_LENGTH = 12;

const BASE_APT_PACKAGES = [
    'build-essential',
    'ca-certificates',
    'cmake',
    'curl',
    'git',
    'patch',
    'pkg-config',
    'python3',
    'tar'
];

const MPI_APT_PACKAGES = ['libopenmpi-dev', 'openmpi-bin'];

export interface BuildResult{
    tag: string;
    hash: string;
    created: boolean;
    spec: ResolvedBuildSpec;
    imageId?: string;
}

const unique = (values: string[]): string[] => {
    return [...new Set(values)];
};

const stableValue = (value: unknown): unknown => {
    if(Array.isArray(value)){
        return value.map(stableValue);
    }

    if(value && typeof value === 'object'){
        return Object.fromEntries(
            Object.entries(value)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entry]) => [key, stableValue(entry)])
        );
    }

    return value;
};

export default class Build{
    constructor(public readonly spec: BuildSpec){}

    resolvedSpec(): ResolvedBuildSpec{
        const mpi = this.spec.mpi ?? true;
        const source = this.spec.source ?? {
            type: 'git',
            repository: DEFAULT_REPOSITORY,
            ref: this.spec.version ?? 'stable'
        };

        return {
            baseImage: this.spec.baseImage ?? DEFAULT_BASE_IMAGE,
            source,
            packages: this.normalizePackages(this.spec.packages ?? []),
            mpi,
            openmp: this.spec.openmp ?? false,
            shared: this.spec.shared ?? false,
            cmakeOptions: [...(this.spec.cmakeOptions ?? [])],
            aptPackages: unique([...BASE_APT_PACKAGES, ...(mpi ? MPI_APT_PACKAGES : []), ...(this.spec.aptPackages ?? [])]),
            env: { ...this.spec.env },
            repository: this.spec.repository ?? DEFAULT_IMAGE_REPOSITORY,
            ...(this.spec.imageTag ? { imageTag: this.spec.imageTag } : {})
        };
    }

    hash(): string{
        return crypto
            .createHash('sha256')
            .update(JSON.stringify(stableValue(this.resolvedSpec())))
            .digest('hex')
            .slice(0, HASH_LENGTH);
    }

    imageTag(): string{
        const spec = this.resolvedSpec();
        return spec.imageTag ?? `${spec.repository}:${this.hash()}`;
    }

    private normalizePackages(packages: string[]): string[]{
        return unique(
            packages
                .map((value) => value.trim().toUpperCase())
                .filter((value) => value.length > 0)
        );
    }
}
