import { Build } from '@lammps-studio/contracts/build/domain';
import { Run } from '@lammps-studio/contracts/run/domain';
import { FakeState } from './fake-data';
import { broadcast } from './fake-socket';

const TICK_MS = 1000;
const TICK_SECONDS = TICK_MS / 1000;
const BUILD_STEP = 0.004;
const BUILT_SIZE_BYTES = 1.2e9;
const STARTED_STEPS_PER_SECOND = 512;

const saveRun = (state: FakeState, run: Run) => {
    state.runs.set(run.simulationId, run);
    broadcast({ type: 'run:updated', run });
};

const advanceRun = (state: FakeState, run: Run) => {
    const { totalSteps, stepsPerSecond } = run.progress;
    if(totalSteps === null || stepsPerSecond === null) return;

    const step = Math.min(totalSteps, Math.round(run.progress.step + stepsPerSecond * TICK_SECONDS));
    const done = step >= totalSteps;
    saveRun(state, {
        ...run,
        state: done ? 'completed' : 'running',
        endedAt: done ? new Date().toISOString() : null,
        progress: { ...run.progress, step }
    });
};

const startWaitingRuns = (state: FakeState, hash: string) => {
    for(const run of state.runs.values()){
        if(run.state !== 'building' || run.buildHash !== hash) continue;

        saveRun(state, { ...run, state: 'running', progress: { ...run.progress, stepsPerSecond: STARTED_STEPS_PER_SECOND } });
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
    for(const run of state.runs.values()){
        if(run.state === 'running') advanceRun(state, run);
    }

    state.builds.filter((build) => build.status === 'building').forEach((build) => advanceBuild(state, build));
};

export const startTicker = (state: FakeState) => setInterval(() => tick(state), TICK_MS);
