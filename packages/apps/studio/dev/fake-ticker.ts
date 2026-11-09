import { Build } from '@lammps-studio/contracts/build/domain';
import { Run } from '@lammps-studio/contracts/run/domain';
import { CU_SIMULATION_ID } from './fake-cu-run';
import { RunRecord } from './fake-runs';
import { broadcast } from './fake-socket';
import { FakeState } from './fake-state';

const TICK_MS = 1000;
const TICK_SECONDS = TICK_MS / 1000;
const BUILD_STEP = 0.004;
const BUILT_SIZE_BYTES = 1.2e9;
const STARTED_STEPS_PER_SECOND = 512;

const saveRun = (record: RunRecord, run: Run) => {
    record.run = run;
    broadcast({ type: 'run:updated', run });
};

const advanceRun = (record: RunRecord) => {
    const { run } = record;
    const { totalSteps, stepsPerSecond } = run.progress;
    if(totalSteps === null || stepsPerSecond === null) return;

    const step = Math.min(totalSteps, Math.round(run.progress.step + stepsPerSecond * TICK_SECONDS));
    const done = step >= totalSteps;
    saveRun(record, {
        ...run,
        state: done ? 'completed' : 'running',
        endedAt: done ? new Date().toISOString() : null,
        progress: { ...run.progress, step }
    });
};

const latestRecords = (state: FakeState): RunRecord[] => [...state.runs.values()].flatMap((records) => records.slice(-1));

const startWaitingRuns = (state: FakeState, hash: string) => {
    for(const record of latestRecords(state)){
        if(record.run.state !== 'building' || record.run.buildHash !== hash) continue;

        saveRun(record, { ...record.run, state: 'running', progress: { ...record.run.progress, stepsPerSecond: STARTED_STEPS_PER_SECOND } });
    }
};

const advanceBuild = (state: FakeState, build: Build) => {
    const progress = Math.min(1, build.progress + BUILD_STEP);
    const done = progress >= 1;
    const next: Build = {
        ...build,
        progress,
        status: done ? 'ready' : 'building',
        sizeBytes: done ? BUILT_SIZE_BYTES : null,
        buildSeconds: done ? (Date.now() - Date.parse(build.createdAt)) / 1000 : null
    };
    state.builds = state.builds.map((item) => (item.hash === build.hash ? next : item));
    broadcast({ type: 'build:updated', build: next });
    if(done) startWaitingRuns(state, build.hash);
};

const tick = (state: FakeState) => {
    for(const record of latestRecords(state)){
        if(record.run.state === 'running' && record.run.simulationId !== CU_SIMULATION_ID) advanceRun(record);
    }

    state.builds.filter((build) => build.status === 'building').forEach((build) => advanceBuild(state, build));
};

export const startTicker = (state: FakeState) => setInterval(() => tick(state), TICK_MS);
