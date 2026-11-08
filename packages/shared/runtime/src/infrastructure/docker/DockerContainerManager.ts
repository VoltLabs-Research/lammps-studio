import Docker from 'dockerode';
import {
    ContainerCreateRequest,
    ContainerHandle,
    ContainerManagerPort,
    ContainerWaitResult
} from '../../ports/ContainerManagerPort';
import type { Logger } from '../../ports/Logger';
import { ContainerErrors } from '../../domain/shared/errors';
import { isDockerNotFound } from '../../domain/shared/toError';
import DockerContainerResolver from './DockerContainerResolver';

const NANO_CPUS_PER_CPU = 1_000_000_000;
const ALL_GPUS = -1;
const BYTES_PER_KIB = 1024;

const MEMORY_MULTIPLIERS: Record<string, number> = {
    b: 1,
    k: BYTES_PER_KIB,
    kb: BYTES_PER_KIB,
    m: BYTES_PER_KIB ** 2,
    mb: BYTES_PER_KIB ** 2,
    g: BYTES_PER_KIB ** 3,
    gb: BYTES_PER_KIB ** 3,
    t: BYTES_PER_KIB ** 4,
    tb: BYTES_PER_KIB ** 4
};

const MEMORY_PATTERN = /^(\d+(?:\.\d+)?)([kmgt]?b?)$/;

const parseMemory = (value: string): number => {
    const match = MEMORY_PATTERN.exec(value.trim().toLowerCase());
    if(!match){
        throw ContainerErrors.InvalidMemory(value);
    }

    const multiplier = MEMORY_MULTIPLIERS[match[2] || 'b'];
    if(multiplier === undefined){
        throw ContainerErrors.InvalidMemory(value);
    }

    return Math.floor(Number(match[1]) * multiplier);
};

export default class DockerContainerManager implements ContainerManagerPort{
    constructor(
        private readonly docker: Docker,
        private readonly containerResolver: DockerContainerResolver,
        private readonly logger: Logger
    ){}

    async create(request: ContainerCreateRequest): Promise<ContainerHandle>{
        const container = await this.docker.createContainer({
            Image: request.imageTag,
            name: request.name,
            WorkingDir: request.workingDir,
            Env: Object.entries(request.env).map(([key, value]) => `${key}=${value}`),
            Labels: request.labels,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            Entrypoint: [request.shell, '-lc'],
            Cmd: [request.command],
            HostConfig: {
                Binds: request.binds,
                ...(request.cpus !== undefined ? { NanoCpus: Math.floor(request.cpus * NANO_CPUS_PER_CPU) } : {}),
                ...(request.memory ? { Memory: parseMemory(request.memory) } : {}),
                ...(request.gpus !== undefined ? {
                    DeviceRequests: [{
                        Driver: 'nvidia',
                        Count: request.gpus === 'all' ? ALL_GPUS : request.gpus,
                        Capabilities: [['gpu']]
                    }]
                } : {})
            }
        });

        this.logger.info(`Container created: ${container.id}`, {
            imageTag: request.imageTag,
            containerName: request.name
        });

        return { id: container.id };
    }

    get(id: string): ContainerHandle{
        return { id };
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

    async kill(container: ContainerHandle){
        await this.containerResolver.resolve(container).kill();
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
