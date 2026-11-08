export interface GitBuildSource{
    type: 'git';
    repository?: string;
    ref?: string;
}

export interface TarballBuildSource{
    type: 'tarball';
    url: string;
    stripComponents?: number;
}

export type BuildSource = GitBuildSource | TarballBuildSource;

export interface BuildSpec{
    baseImage?: string;
    source?: BuildSource;
    version?: string;
    packages?: string[];
    mpi?: boolean;
    openmp?: boolean;
    shared?: boolean;
    cmakeOptions?: string[];
    aptPackages?: string[];
    env?: Record<string, string>;
    repository?: string;
    imageTag?: string;
}

export interface ResolvedBuildSpec{
    baseImage: string;
    source: BuildSource;
    packages: string[];
    mpi: boolean;
    openmp: boolean;
    shared: boolean;
    cmakeOptions: string[];
    aptPackages: string[];
    env: Record<string, string>;
    repository: string;
    imageTag?: string;
}
