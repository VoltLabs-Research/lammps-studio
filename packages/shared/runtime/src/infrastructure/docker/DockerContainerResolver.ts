import Docker from 'dockerode';
import { ContainerHandle } from '../../ports/ContainerManagerPort';

export default class DockerContainerResolver{
    constructor(private readonly docker: Docker){}

    resolve(container: ContainerHandle): Docker.Container{
        return this.docker.getContainer(container.id);
    }
}
