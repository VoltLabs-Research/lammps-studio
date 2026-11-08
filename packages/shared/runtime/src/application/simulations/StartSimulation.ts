import crypto from 'node:crypto';
import path from 'node:path';
import Run from '../../domain/simulation/Run';
import RunHandle from '../../domain/simulation/RunHandle';
import { CONTAINER_SIMULATION_DIR, RUN_LABEL, RunSpec, SIMULATION_LABEL } from '../../domain/simulation/RunSpec';
import { toError } from '../../domain/shared/toError';
import { ContainerHandle, ContainerManagerPort } from '../../ports/ContainerManagerPort';
import LammpsCommandBuilder from './LammpsCommandBuilder';
import RunMonitor, { RunSession } from './RunMonitor';
import SimulationLifecycleManager from './SimulationLifecycleManager';

const CONTAINER_NAME_BYTES = 4;

const containerRunDir = (spec: RunSpec): string => {
    const relative = path.relative(path.resolve(spec.simulationDir), spec.run.dir).split(path.sep);
    return path.posix.join(CONTAINER_SIMULATION_DIR, ...relative);
};

export default class StartSimulation{
    constructor(
        private readonly commandBuilder: LammpsCommandBuilder,
        private readonly containerManager: ContainerManagerPort,
        private readonly lifecycleManager: SimulationLifecycleManager,
        private readonly monitor: RunMonitor,
        private readonly createHandle: (run: Run) => RunHandle,
        private readonly containerUser: string | null
    ){}

    async execute(spec: RunSpec): Promise<RunHandle>{
        const run = new Run({
            simulationId: spec.simulationId,
            runNumber: spec.run.number,
            imageTag: spec.image,
            runDir: spec.run.dir
        });
        await this.lifecycleManager.prepare(run);

        let container: ContainerHandle | null = null;
        let session: RunSession | null = null;

        try{
            container = await this.createContainer(spec);
            await this.lifecycleManager.markStarting(run, container.id);
            session = await this.monitor.observe(run, container);
            await this.containerManager.start(container);
            await this.lifecycleManager.markRunning(run, container.id, null);
        }catch(error){
            await this.lifecycleManager.fail(run, toError(error).message);
            if(container){
                await this.monitor.release(container, session);
            }

            throw error;
        }

        void this.monitor.complete(run, container, session);
        return this.createHandle(run);
    }

    private async createContainer(spec: RunSpec): Promise<ContainerHandle>{
        const command = this.commandBuilder.build({
            entry: spec.run.entry,
            execution: spec.execution,
            variables: spec.variables,
            allowRunAsRoot: this.containerUser === null
        });

        return await this.containerManager.create({
            image: spec.image,
            name: `lammps-${crypto.randomBytes(CONTAINER_NAME_BYTES).toString('hex')}`,
            argv: command.argv,
            workingDir: containerRunDir(spec),
            binds: [`${path.resolve(spec.simulationDir)}:${CONTAINER_SIMULATION_DIR}`],
            env: command.env,
            labels: {
                [SIMULATION_LABEL]: spec.simulationId,
                [RUN_LABEL]: String(spec.run.number)
            },
            user: this.containerUser,
            gpus: spec.execution.gpus
        });
    }
}
