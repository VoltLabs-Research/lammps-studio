import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { MachineErrors } from '@lammps-studio/contracts/machine/errors';
import { Run, RunConfig, RunProgress, RunState } from '@lammps-studio/contracts/run/domain';
import { RunErrors } from '@lammps-studio/contracts/run/errors';
import { StartRunInput, StopRunInput } from '@lammps-studio/contracts/run/http';
import { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { SimulationErrors } from '@lammps-studio/contracts/simulation/errors';
import { analyseScript } from '@lammps-studio/lammps/script/analyse-script';
import { buildMatching, newBuild } from './fake-builds';
import { CU_SIMULATION_ID, plannedCuProgress } from './fake-cu-run';
import { scriptFiles } from './fake-folders';
import { randomHash } from './fake-helpers';
import { STARTING_TICKS, STOP_GRACE_TICKS } from './fake-lifecycle';
import { fail, Failure } from './fake-router';
import { driverOf, endProgress } from './fake-run-driver';
import { publishChange } from './fake-run-events';
import { plannedRun, recordOf, RunRecord } from './fake-runs';
import { broadcast } from './fake-socket';
import { FakeState, filesOf, latestRecord, recordsOf } from './fake-state';

const ACTIVE: RunState[] = ['queued', 'building', 'starting', 'running', 'stopping'];
const BEFORE_LAMMPS: RunState[] = ['queued', 'building', 'starting'];

const startableMachine = (state: FakeState, simulation: Simulation, { machineId }: RunConfig): Machine | Failure => {
    const machine = state.machines.find((item) => item.id === machineId);
    if(!machine) return fail(MachineErrors, 'NotFound');
    if(machine.status === 'offline') return fail(MachineErrors, 'Offline');

    const latest = latestRecord(state, simulation.id);
    if(latest && ACTIVE.includes(latest.run.state)) return fail(RunErrors, 'AlreadyRunning');

    return machine;
};

const buildFor = (state: FakeState, machine: Machine, { version, packages }: RunConfig, at: string): Build => {
    const existing = buildMatching(state.builds, machine.id, version, packages);
    if(existing) return existing;

    const build = newBuild({ machine, version, packages, hash: randomHash(), createdAt: at, progress: 0, usedBy: 1 });
    state.builds = [...state.builds, build];
    broadcast({ type: 'build:updated', build });

    return build;
};

const plannedProgress = (simulationId: string, script: ScriptInfo): RunProgress => {
    if(simulationId === CU_SIMULATION_ID) return plannedCuProgress();

    return {
        step: 0,
        totalSteps: script.runs.reduce((sum, run) => sum + run.steps, 0),
        section: 1,
        sections: 1,
        stepsPerSecond: null
    };
};

export const startRun = (state: FakeState, simulation: Simulation, { config }: StartRunInput): Run | Failure => {
    const machine = startableMachine(state, simulation, config);
    if(machine instanceof Failure) return machine;
    const files = scriptFiles(filesOf(state, simulation.id));
    if(!files.some((file) => file.path === config.entry)) return fail(SimulationErrors, 'NoEntryScript');

    const startedAt = new Date().toISOString();
    const build = buildFor(state, machine, config, startedAt);
    const number = (latestRecord(state, simulation.id)?.run.number ?? 0) + 1;
    const record = recordOf(plannedRun({
        simulationId: simulation.id,
        number,
        state: build.status === 'ready' ? 'starting' : 'building',
        config,
        buildHash: build.hash,
        startedAt,
        progress: plannedProgress(simulation.id, analyseScript(config.entry, files))
    }));
    record.wait = STARTING_TICKS;
    state.runs.set(simulation.id, [...recordsOf(state, simulation.id), record]);
    state.live = true;
    broadcast({ type: 'run:updated', run: record.run });

    return record.run;
};

const stopLammps = (state: FakeState, record: RunRecord, kill: boolean, at: string) => {
    const { run } = record;
    const driver = driverOf(run.simulationId);
    if(kill){
        publishChange(record, driver.kill(run, at));
        return;
    }
    if(run.state === 'stopping') return;

    record.wait = STOP_GRACE_TICKS;
    publishChange(record, driver.stop());
    state.live = true;
};

export const stopRun = (state: FakeState, record: RunRecord, { kill }: StopRunInput): Run | Failure => {
    const at = new Date().toISOString();
    if(BEFORE_LAMMPS.includes(record.run.state)){
        publishChange(record, endProgress(record.run, at));
        return record.run;
    }
    if(record.run.state !== 'running' && record.run.state !== 'stopping') return fail(RunErrors, 'NotRunning');

    stopLammps(state, record, kill, at);

    return record.run;
};
