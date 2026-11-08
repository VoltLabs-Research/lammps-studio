import Docker from 'dockerode';
import {
    ContainerCreateRequest,
    ContainerHandle,
    ContainerManagerPort,
    ContainerWaitResult
} from '../../ports/ContainerManagerPort';
import type { Logger } from '../../ports/Logger';
import { isDockerNotFound } from '../../domain/shared/toError';
import DockerContainerResolver from './DockerContainerResolver';

const gpuRequests = (gpus: number): Docker.DeviceRequest[] => {
    if(gpus <= 0){
        return [];
    }

    return [{
        Driver: 'nvidia',
        Count: gpus,
        Capabilities: [['gpu']]
    }];
};

export default class DockerContainerManager implements ContainerManagerPort{
    constructor(
        private readonly docker: Docker,
        private readonly containerResolver: DockerContainerResolver,
        private readonly logger: Logger
    ){}

    async create(request: ContainerCreateRequest): Promise<ContainerHandle>{
        const container = await this.docker.createContainer({
            Image: request.image,
            name: request.name,
            Cmd: request.argv,
            WorkingDir: request.workingDir,
            Env: Object.entries(request.env).map(([key, value]) => `${key}=${value}`),
            Labels: request.labels,
            ...(request.user === null ? {} : { User: request.user }),
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            HostConfig: {
                Binds: request.binds,
                Init: true,
                DeviceRequests: gpuRequests(request.gpus)
            }
        });

        this.logger.info(`Container created: ${container.id}`, { image: request.image, name: request.name });
        return { id: container.id };
    }

    async start(container: ContainerHandle){
        await this.containerResolver.resolve(container).start();
    }

    async wait(container: ContainerHandle): Promise<ContainerWaitResult>{
        const result = await this.containerResolver.resolve(container).wait();
        return {
            exitCode: typeof result?.StatusCode === 'number' ? result.StatusCode : null
        };
    }

    async stop(container: ContainerHandle, timeoutSeconds: number){
        await this.containerResolver.resolve(container).stop({ t: timeoutSeconds });
    }

    async remove(container: ContainerHandle){
        try{
            await this.containerResolver.resolve(container).remove({ force: true });
        }catch(error){
            if(!isDockerNotFound(error)){
                throw error;
            }

            this.logger.debug(`Container already removed: ${container.id}`);
        }
    }
}
