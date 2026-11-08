import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BuildProgress } from '../src/domain/build/BuildStage';
import DockerBuildProgress from '../src/infrastructure/docker/DockerBuildProgress';
import DockerBuildStream, { DockerBuildEvent } from '../src/infrastructure/docker/DockerBuildStream';
import { renderDockerfile } from '../src/infrastructure/docker/renderDockerfile';
import Build from '../src/domain/build/Build';

const VERSION = 'stable_22Jul2025_update1';
const BUILD = new Build({ version: VERSION, packages: ['MANYBODY'] });

const events: DockerBuildEvent[] = readFileSync(new URL('./fixtures/build-manybody.jsonl', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));

interface Replay{
    lines: string[];
    snapshots: BuildProgress[];
    tracker: DockerBuildProgress;
}

const replay = (): Replay => {
    const tracker = new DockerBuildProgress(renderDockerfile(BUILD).stages, VERSION);
    const lines: string[] = [];
    const snapshots: BuildProgress[] = [tracker.snapshot()];
    const stream = new DockerBuildStream((line) => {
        lines.push(line);
        tracker.push(line);
        snapshots.push(tracker.snapshot());
    });

    events.forEach((event) => stream.push(event));
    stream.end();

    return { lines, snapshots, tracker };
};

const snapshotAfter = ({ lines, snapshots }: Replay, matcher: RegExp): BuildProgress => {
    const index = lines.findIndex((line) => matcher.test(line));
    return snapshots[index + 1];
};

const stateOf = (snapshot: BuildProgress): string[] => snapshot.steps.map((step) => `${step.state}:${step.name}`);

describe('docker build output', () => {
    it('frames the stream into clean lines without colour codes or carriage-return progress', () => {
        const { lines } = replay();

        expect(lines).toContain('CMake Deprecation Warning at CMakeLists.txt:22 (cmake_policy):');
        expect(lines).toContain('Updating files: 100% (13889/13889), done.');
        expect(lines.some((line) => line.includes('\u001b') || line.includes('\r'))).toBe(false);
    });

    it('starts on Resolve the build with every other step pending', () => {
        const [first] = replay().snapshots;

        expect(first.progress).toBe(0);
        expect(stateOf(first)).toEqual([
            'active:Resolve the build',
            'pending:Pull the base image',
            'pending:Install compilers and OpenMPI',
            `pending:Clone LAMMPS ${VERSION}`,
            'pending:Configure with CMake',
            'pending:Compile',
            'pending:Install lmp'
        ]);
    });

    it.each([
        [/^Step 1\/6 : FROM/, 'Pull the base image'],
        [/^Step 2\/6 : RUN apt-get/, 'Install compilers and OpenMPI'],
        [/^Step 3\/6 : RUN git clone/, `Clone LAMMPS ${VERSION}`],
        [/^Step 4\/6 : RUN cmake -S/, 'Configure with CMake'],
        [/^Step 5\/6 : RUN cmake --build/, 'Compile'],
        [/^-- Install configuration:/, 'Install lmp']
    ])('moves to the right step on %s', (matcher, name) => {
        const snapshot = snapshotAfter(replay(), matcher);
        const active = snapshot.steps.filter((step) => step.state === 'active');

        expect(active.map((step) => step.name)).toEqual([name]);
    });

    it('names the base image on the pull step', () => {
        const snapshot = snapshotAfter(replay(), /^Step 2\/6/);

        expect(snapshot.steps[1]).toEqual({ name: 'Pull the base image', state: 'done', detail: 'ubuntu:24.04' });
    });

    it('counts compiled files against an estimate taken from the [ xx%] lines', () => {
        const snapshot = snapshotAfter(replay(), /\[ 53%\] Building CXX object .*fix_wall_lj93/);
        const compile = snapshot.steps[5];

        expect(compile.state).toBe('active');
        expect(compile.detail).toMatch(/^\d+ \/ \d+ files$/);

        const [done, total] = (compile.detail ?? '').split(' ').filter((part) => /^\d+$/.test(part)).map(Number);
        expect(done).toBeGreaterThan(150);
        expect(total).toBeGreaterThan(380);
        expect(total).toBeLessThan(440);
        expect(snapshot.progress).toBeGreaterThan(0.32 + 0.64 * 0.4);
        expect(snapshot.progress).toBeLessThan(0.32 + 0.64 * 0.6);
    });

    it('never moves progress backwards', () => {
        const progress = replay().snapshots.map((snapshot) => snapshot.progress);

        expect(progress.every((value, index) => index === 0 || value >= progress[index - 1])).toBe(true);
    });

    it('finishes with every step done, the real file count and progress 1', () => {
        const { tracker, lines } = replay();
        tracker.complete();
        const snapshot = tracker.snapshot();

        expect(snapshot.progress).toBe(1);
        expect(snapshot.steps.every((step) => step.state === 'done')).toBe(true);
        expect(snapshot.steps[5].detail).toBe('402 / 402 files');
        expect(snapshot.output).toBe(lines.at(-1));
        expect(lines.at(-1)).toBe('Successfully tagged lammps/lammps-runtime:8ec0c210e389');
    });

    it('keeps the last meaningful line as output and skips the docker layer chatter', () => {
        const { lines, snapshots } = replay();
        const index = lines.findIndex((line) => line.startsWith(' ---> Running in'));

        expect(snapshots[index + 1].output).toBe(snapshots[index].output);
    });
});
