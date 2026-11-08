import { describe, expect, it } from 'vitest';
import RunHandle from '../src/domain/simulation/RunHandle';
import Run from '../src/domain/simulation/Run';
import EventEmitterBus from '../src/infrastructure/events/EventEmitterBus';
import { RuntimeEventMap } from '../src/domain/observability/EventMap';

const runOf = (runNumber: number): Run => new Run({ simulationId: 'cu', runNumber, imageTag: 'image', runDir: `/sim/runs/run-${runNumber}` });

const handleFor = (run: Run, bus: EventEmitterBus<RuntimeEventMap>): RunHandle => {
    return new RunHandle(
        run.id,
        bus,
        async () => run.snapshot(),
        async () => run.snapshot(),
        async () => run.snapshot()
    );
};

describe('RunHandle', () => {
    it('delivers only the events of its own run', () => {
        const bus = new EventEmitterBus<RuntimeEventMap>();
        const own = runOf(1);
        const other = runOf(2);
        const handle = handleFor(own, bus);
        const lines: string[] = [];

        handle.on('simulation:stdout', ({ line }) => lines.push(line));
        bus.emit('simulation:stdout', { runId: other.id, line: 'not mine' });
        bus.emit('simulation:stdout', { runId: own.id, line: 'mine' });

        expect(lines).toEqual(['mine']);
    });

    it('resolves waitForEnd with the snapshot of the end event', async () => {
        const bus = new EventEmitterBus<RuntimeEventMap>();
        const run = runOf(3);
        const handle = handleFor(run, bus);
        run.markCompleted(0);

        const ended = handle.waitForEnd();
        bus.emit('simulation:end', { runId: run.id, exitCode: 0, snapshot: run.snapshot() });

        expect(await ended).toMatchObject({ id: 'cu/run-3', state: 'completed', exitCode: 0 });
    });
});
