import Docker from 'dockerode';
import {
    ContainerCreateRequest,
    ContainerHandle,
    ContainerManagerPort,
    ContainerWaitResult,
    RunContainer
} from '../../ports/ContainerManagerPort';
import type { Logger } from '../../ports/Logger';
import { RUN_LABEL } from '../../domain/simulation/RunSpec';
import { isDockerAlreadyStopped, isDockerGone } from '../../domain/shared/toError';
import DockerContainerResolver from './DockerContainerResolver';
import { toRunContainer } from './toRunContainer';

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
        try{
            await this.containerResolver.resolve(container).stop({ t: timeoutSeconds });
        }catch(error){
            if(!isDockerAlreadyStopped(error)){
                throw error;
            }

            this.logger.debug(`Container already stopped: ${container.id}`);
        }
    }

    async remove(container: ContainerHandle){
        try{
            await this.containerResolver.resolve(container).remove({ force: true });
        }catch(error){
            if(!isDockerGone(error)){
                throw error;
            }

            this.logger.debug(`Container already removed: ${container.id}`);
        }
    }

    async inspect(containerId: string): Promise<RunContainer>{
        const info = await this.docker.getContainer(containerId).inspect();
        return toRunContainer(info);
    }

    async list(): Promise<RunContainer[]>{
        const containers = await this.docker.listContainers({ all: true, filters: { label: [RUN_LABEL] } });
        return await Promise.all(containers.map(async (container) => await this.inspect(container.Id)));
    }
}
