import { describe, expect, it } from 'vitest';
import RunHandle from '../src/domain/simulation/RunHandle';
import Run from '../src/domain/simulation/Run';
import EventEmitterBus from '../src/infrastructure/events/EventEmitterBus';
import { RuntimeEventMap } from '../src/domain/observability/EventMap';

const handleFor = (runId: string, bus: EventEmitterBus<RuntimeEventMap>): RunHandle => {
    const run = new Run(runId, 'image', '/tmp');
    return new RunHandle(
        runId,
        bus,
        async () => run.snapshot(),
        async () => run.snapshot(),
        async () => run.snapshot()
    );
};

describe('RunHandle', () => {
    it('delivers only the events of its own run', () => {
        const bus = new EventEmitterBus<RuntimeEventMap>();
        const handle = handleFor('run-a', bus);
        const other = new Run('run-b', 'image', '/tmp');
        const own = new Run('run-a', 'image', '/tmp');
        const lines: string[] = [];

        handle.on('simulation:stdout', ({ line }) => lines.push(line));
        bus.emit('simulation:stdout', { runId: 'run-b', line: 'not mine', snapshot: other.snapshot() });
        bus.emit('simulation:stdout', { runId: 'run-a', line: 'mine', snapshot: own.snapshot() });

        expect(lines).toEqual(['mine']);
    });

    it('resolves waitForEnd with the snapshot of the end event', async () => {
        const bus = new EventEmitterBus<RuntimeEventMap>();
        const handle = handleFor('run-a', bus);
        const run = new Run('run-a', 'image', '/tmp');
        run.markCompleted(0);

        const ended = handle.waitForEnd();
        bus.emit('simulation:end', { runId: 'run-a', exitCode: 0, snapshot: run.snapshot() });

        expect(await ended).toMatchObject({ state: 'completed', exitCode: 0 });
    });
});
