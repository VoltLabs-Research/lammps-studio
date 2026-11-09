import { Build } from '@lammps-studio/contracts/build/domain';
import { BUILD_PROGRESS_PER_SECOND, advanceBuild } from './fake-builds';
import { STARTING_TICKS, TICK_SECONDS } from './fake-clock';
import { contextOf } from './fake-cu-run';
import { driverOf } from './fake-run-driver';
import { publishChange } from './fake-run-events';
import { RunRecord } from './fake-runs';
import { broadcast } from './fake-socket';
import { FakeState, latestRecords } from './fake-state';

const countDown = (record: RunRecord): boolean => {
    record.wait = Math.max(0, record.wait - 1);

    return record.wait === 0;
};

export const tickRecord = (state: FakeState, record: RunRecord, at: string) => {
    const { run } = record;
    const driver = driverOf(run.simulationId);
    const context = contextOf(state.machines, run);
    if(run.state === 'running'){
        publishChange(record, driver.advance(run, context, at));
        return;
    }

    if(run.state === 'starting' && countDown(record)) publishChange(record, driver.begin(run, context));
    if(run.state === 'stopping' && countDown(record)) publishChange(record, driver.cancel(run, context, at));
};

const startWaitingRuns = (state: FakeState, hash: string) => {
    for(const record of latestRecords(state)){
        if(record.run.state !== 'building' || record.run.buildHash !== hash) continue;

        record.wait = STARTING_TICKS;
        publishChange(record, { patch: { state: 'starting' }, lines: [], frames: [] });
    }
};

export const tickBuild = (state: FakeState, build: Build, now: number) => {
    const next = advanceBuild(build, BUILD_PROGRESS_PER_SECOND * TICK_SECONDS, now);
    state.builds = state.builds.map((item) => (item.hash === build.hash ? next : item));
    broadcast({ type: 'build:updated', build: next });
    if(next.status === 'ready') startWaitingRuns(state, next.hash);
};
