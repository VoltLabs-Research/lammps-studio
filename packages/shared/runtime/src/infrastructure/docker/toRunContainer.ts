import path from 'node:path';
import Docker from 'dockerode';
import { CONTAINER_SIMULATION_DIR, RUN_LABEL, SIMULATION_LABEL } from '../../domain/simulation/RunSpec';
import { RunErrors } from '../../domain/shared/errors';
import { RunContainer, RunContainerState } from '../../ports/ContainerManagerPort';

const RUNNING_STATUSES = new Set(['running', 'paused', 'restarting']);
const CREATED_STATUS = 'created';
const NEVER_STARTED = '0001-01-01T00:00:00Z';

const stateOf = (status: string): RunContainerState => {
    if(RUNNING_STATUSES.has(status)){
        return 'running';
    }

    return status === CREATED_STATUS ? 'created' : 'exited';
};

export const toRunContainer = (info: Docker.ContainerInspectInfo): RunContainer => {
    const labels = info.Config.Labels ?? {};
    const simulationId = labels[SIMULATION_LABEL];
    const runNumber = Number(labels[RUN_LABEL]);
    const mount = info.Mounts.find((entry) => entry.Destination === CONTAINER_SIMULATION_DIR);

    if(simulationId === undefined || !Number.isInteger(runNumber) || !mount){
        throw RunErrors.NotStudioContainer(info.Id);
    }

    const state = stateOf(info.State.Status);
    const relativeDir = path.posix.relative(CONTAINER_SIMULATION_DIR, info.Config.WorkingDir);

    return {
        id: info.Id,
        image: info.Config.Image,
        simulationId,
        runNumber,
        runDir: path.join(mount.Source, ...relativeDir.split(path.posix.sep)),
        state,
        exitCode: state === 'exited' ? info.State.ExitCode : null,
        startedAt: info.State.StartedAt === NEVER_STARTED ? null : info.State.StartedAt
    };
};
