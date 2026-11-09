import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Docker from 'dockerode';
import Build from '../../domain/build/Build';
import { BuildErrors } from '../../domain/shared/errors';
import { isDockerNotFound } from '../../domain/shared/toError';
import type { Logger } from '../../ports/Logger';
import { BuildObserver, ImageBuilderPort, ImageInfo } from '../../ports/ImageBuilderPort';
import { renderDockerfile } from './renderDockerfile';
import DockerBuildProgress from './DockerBuildProgress';
import DockerBuildStream from './DockerBuildStream';

export default class DockerImageBuilder implements ImageBuilderPort{
    constructor(
        private readonly docker: Docker,
        private readonly logger: Logger
    ){}

    async inspect(tag: string): Promise<ImageInfo | null>{
        try{
            const image = await this.docker.getImage(tag).inspect();
            return {
                imageId: image.Id,
                sizeBytes: image.Size
            };
        }catch(error){
            if(isDockerNotFound(error)){
                return null;
            }

            throw error;
        }
    }

    async remove(tag: string){
        try{
            await this.docker.getImage(tag).remove();
        }catch(error){
            if(!isDockerNotFound(error)){
                throw error;
            }

            this.logger.debug(`Image already removed: ${tag}`);
            return;
        }

        this.logger.info(`Docker image removed: ${tag}`);
    }

    async build(build: Build, observer: BuildObserver, signal: AbortSignal): Promise<ImageInfo>{
        const tag = build.tag();
        const dockerfile = renderDockerfile(build);
        const progress = new DockerBuildProgress(dockerfile.stages, build.version);
        const contextDir = await mkdtemp(path.join(os.tmpdir(), 'lammps-runtime-build-'));

        observer.progress(progress.snapshot());

        try{
            await writeFile(path.join(contextDir, 'Dockerfile'), dockerfile.text, 'utf8');
            const stream = await this.docker.buildImage({ context: contextDir, src: ['Dockerfile'] }, { t: tag, abortSignal: signal });
            await this.follow(stream, (line) => {
                progress.push(line);
                observer.line(line);
                observer.progress(progress.snapshot());
            });
        }finally{
            await rm(contextDir, { recursive: true, force: true });
        }

        const image = await this.inspect(tag);
        if(!image){
            throw BuildErrors.Failed(`image ${tag} missing after build`);
        }

        progress.complete();
        observer.progress(progress.snapshot());
        this.logger.info(`Docker image built: ${tag}`, { imageId: image.imageId });

        return image;
    }

    private async follow(stream: NodeJS.ReadableStream, onLine: (line: string) => void){
        const output = new DockerBuildStream(onLine);

        await new Promise<void>((resolve, reject) => {
            this.docker.modem.followProgress(
                stream,
                (error: Error | null) => {
                    if(error){
                        reject(error);
                        return;
                    }

                    resolve();
                },
                (event) => output.push(event)
            );
        });

        output.end();

        if(output.error !== null){
            throw BuildErrors.Failed(output.error);
        }
    }
}
