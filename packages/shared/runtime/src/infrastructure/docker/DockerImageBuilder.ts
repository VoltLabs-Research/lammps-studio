import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Docker from 'dockerode';
import Build, { BuildResult } from '../../domain/build/Build';
import { ResolvedBuildSpec } from '../../domain/build/BuildSpec';
import { isDockerNotFound } from '../../domain/shared/toError';
import type { Logger } from '../../ports/Logger';
import { ImageBuilderPort } from '../../ports/ImageBuilderPort';

const DEFAULT_GIT_REPOSITORY = 'https://github.com/lammps/lammps.git';
const DEFAULT_GIT_REF = 'stable';
const DEFAULT_STRIP_COMPONENTS = 1;

interface BuildProgressEvent{
    stream?: string;
    status?: string;
    progress?: string;
    error?: string;
}

const shellEscape = (value: string): string => {
    if(value.length === 0){
        return "''";
    }

    return `'${value.replace(/'/g, `'\\''`)}'`;
};

const renderCmakeArgs = (spec: ResolvedBuildSpec): string[] => {
    return [
        `-DBUILD_MPI=${spec.mpi ? 'yes' : 'no'}`,
        `-DBUILD_OMP=${spec.openmp ? 'yes' : 'no'}`,
        `-DBUILD_SHARED_LIBS=${spec.shared ? 'yes' : 'no'}`,
        '-DCMAKE_BUILD_TYPE=Release',
        ...spec.packages.map((name) => `-DPKG_${name}=yes`),
        ...spec.cmakeOptions
    ];
};

const renderSource = (spec: ResolvedBuildSpec): string[] => {
    if(spec.source.type === 'git'){
        return [
            `RUN git clone ${shellEscape(spec.source.repository ?? DEFAULT_GIT_REPOSITORY)} /opt/lammps-src`,
            `RUN cd /opt/lammps-src && git checkout ${shellEscape(spec.source.ref ?? DEFAULT_GIT_REF)}`
        ];
    }

    return [
        `RUN curl -fsSL ${shellEscape(spec.source.url)} -o /tmp/lammps-src.tar.gz`,
        `RUN mkdir -p /opt/lammps-src && tar -xzf /tmp/lammps-src.tar.gz -C /opt/lammps-src --strip-components=${spec.source.stripComponents ?? DEFAULT_STRIP_COMPONENTS}`
    ];
};

const renderDockerfile = (spec: ResolvedBuildSpec): string => {
    const cmakeArgs = renderCmakeArgs(spec).map(shellEscape).join(' ');
    const envLines = Object.entries(spec.env).map(([key, value]) => `ENV ${key}=${JSON.stringify(value)}`);

    return [
        `FROM ${spec.baseImage}`,
        'SHELL ["/bin/bash", "-lc"]',
        'ARG DEBIAN_FRONTEND=noninteractive',
        `RUN apt-get update && apt-get install -y --no-install-recommends ${spec.aptPackages.map(shellEscape).join(' ')} && rm -rf /var/lib/apt/lists/*`,
        'WORKDIR /opt',
        ...renderSource(spec),
        'RUN mkdir -p /opt/lammps-build /opt/lammps-install',
        `RUN cmake -S /opt/lammps-src/cmake -B /opt/lammps-build ${cmakeArgs}`,
        'RUN cmake --build /opt/lammps-build --parallel "$(nproc)"',
        'RUN cmake --install /opt/lammps-build --prefix /opt/lammps-install',
        'ENV PATH=/opt/lammps-install/bin:$PATH',
        ...envLines,
        'WORKDIR /workspace',
        ''
    ].join('\n');
};

const formatProgressEvent = (event: BuildProgressEvent): string => {
    if(typeof event.stream === 'string'){
        return event.stream.trim();
    }

    if(typeof event.error === 'string'){
        return event.error;
    }

    return [event.status, event.progress].filter(Boolean).join(' ');
};

export default class DockerImageBuilder implements ImageBuilderPort{
    constructor(
        private readonly docker: Docker,
        private readonly logger: Logger
    ){}

    async exists(tag: string): Promise<boolean>{
        try{
            await this.docker.getImage(tag).inspect();
            return true;
        }catch(error){
            if(isDockerNotFound(error)){
                return false;
            }

            throw error;
        }
    }

    async build(build: Build, onProgress: (message: string) => void): Promise<BuildResult>{
        const tag = build.imageTag();
        const spec = build.resolvedSpec();
        const contextDir = await mkdtemp(path.join(os.tmpdir(), 'lammps-runtime-build-'));

        try{
            await writeFile(path.join(contextDir, 'Dockerfile'), renderDockerfile(spec), 'utf8');
            const stream = await this.docker.buildImage({ context: contextDir, src: ['Dockerfile'] }, { t: tag, pull: true });

            await new Promise<void>((resolve, reject) => {
                this.docker.modem.followProgress(
                    stream,
                    (error) => error ? reject(error) : resolve(),
                    (event: BuildProgressEvent) => {
                        const message = formatProgressEvent(event);
                        if(message.length > 0){
                            onProgress(message);
                        }
                    }
                );
            });

            const image = await this.docker.getImage(tag).inspect();
            this.logger.info(`Docker image built: ${tag}`, { imageId: image.Id });

            return {
                tag,
                hash: build.hash(),
                created: true,
                spec,
                imageId: image.Id
            };
        }finally{
            await rm(contextDir, { recursive: true, force: true });
        }
    }
}
