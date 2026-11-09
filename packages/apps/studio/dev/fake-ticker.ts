import { TICK_MS } from './fake-clock';
import { tickBuild, tickRecord } from './fake-lifecycle';
import { FakeState, latestRecords } from './fake-state';

const tick = (state: FakeState) => {
    const now = Date.now();
    const at = new Date(now).toISOString();
    latestRecords(state).forEach((record) => tickRecord(state, record, at));
    state.builds.filter((build) => build.status === 'building').forEach((build) => tickBuild(state, build, now));
};

export const startTicker = (state: FakeState) => setInterval(() => tick(state), TICK_MS);
