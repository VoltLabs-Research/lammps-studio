import { formatDuration } from '@/shared/utils/formatDuration';
import { RunConfig } from '@lammps-studio/contracts/run/domain';
import { usesThreads } from '@lammps-studio/lammps/catalog/accelerators';
import { runCommand } from '@lammps-studio/lammps/command/run-command';
import { STOP_TIMEOUT_SECONDS } from '@lammps-studio/runtime/application/simulations/StopSimulation';
import { posix } from 'node:path';

const SHORT_CONTAINER_ID = 12;
const LINE_BREAK = '\n';

const integer = new Intl.NumberFormat('en-US');

const nearStep = (step: number | null): string => {
    if(step === null) return '';

    return ` near step ${integer.format(step)}`;
};

const ranksOf = ({ accelerator, mpiRanks, threadsPerRank }: RunConfig): string => {
    if(!usesThreads(accelerator)) return `${mpiRanks} MPI`;

    return `${mpiRanks} MPI × ${threadsPerRank} OpenMP`;
};

export const startedLine = (runNumber: number, machineName: string, buildHash: string): string => `run ${runNumber} on ${machineName} · build ${buildHash}`;

export const buildingLine = ({ version, packages }: RunConfig): string => {
    if(packages.length === 0) return `building LAMMPS ${version} with no extra packages`;

    return `building LAMMPS ${version} with ${packages.join(', ')}`;
};

export const buildFailedLine = (output: string): string => `the build failed · ${output}`;

export const containerLines = (containerId: string, config: RunConfig, buildHash: string): string[] => [
    `container ${containerId.slice(0, SHORT_CONTAINER_ID)} started · ${ranksOf(config)}`,
    ...runCommand({ ...config, entry: posix.basename(config.entry) }, buildHash).split(LINE_BREAK)
];

export const notStartedLine = (message: string): string => `the container did not start · ${message}`;

export const lostLine = (message: string): string => `the agent lost the container · ${message}`;

export const stopRequestedLine = (): string => `stop requested · docker stop, ${STOP_TIMEOUT_SECONDS} s grace`;

export const killedLine = (step: number | null): string => `killed${nearStep(step)} · docker kill`;

export const completedLine = (runNumber: number, seconds: number): string => `run ${runNumber} completed · exit code 0 · ${formatDuration(seconds)}`;

export const exitedLine = (exitCode: number, step: number | null): string => `LAMMPS exited with code ${exitCode}${nearStep(step)} · container removed`;

export const terminatedLine = (step: number | null): string => `LAMMPS received SIGTERM${nearStep(step)}`;

export const stoppedLine = (runNumber: number): string => `run ${runNumber} stopped`;
