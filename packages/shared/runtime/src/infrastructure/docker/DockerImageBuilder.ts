import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Docker from 'dockerode';
import Build from '../../domain/build/Build';
import { BuildErrors } from '../../domain/shared/errors';
import { isDockerNotFound } from '../../domain/shared/toError';
import type { Logger } from '../../ports/Logger';
import { ImageBuilderPort, ImageInfo } from '../../ports/ImageBuilderPort';
import { renderDockerfile } from './renderDockerfile';
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

    async build(build: Build, onLine: (line: string) => void): Promise<ImageInfo>{
        const tag = build.tag();
        const contextDir = await mkdtemp(path.join(os.tmpdir(), 'lammps-runtime-build-'));

        try{
            await writeFile(path.join(contextDir, 'Dockerfile'), renderDockerfile(build).text, 'utf8');
            const stream = await this.docker.buildImage({ context: contextDir, src: ['Dockerfile'] }, { t: tag });
            await this.follow(stream, onLine);
        }finally{
            await rm(contextDir, { recursive: true, force: true });
        }

        const image = await this.inspect(tag);
        if(!image){
            throw BuildErrors.Failed(`image ${tag} missing after build`);
        }

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
