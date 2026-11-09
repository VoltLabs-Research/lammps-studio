import { logger } from '@lammps-studio/readable/utils/Logger';
import { BuildProgress } from '@lammps-studio/runtime/domain/build/BuildStage';
import { DumpFrame } from '@lammps-studio/runtime/domain/dump/DumpFrame';
import { BuildErrors, DumpErrors } from '@lammps-studio/runtime/domain/shared/errors';
import { CONTAINER_SIMULATION_DIR, RUN_LABEL, SIMULATION_LABEL } from '@lammps-studio/runtime/domain/simulation/RunSpec';
import { ContainerCreateRequest, ContainerHandle, ContainerManagerPort, ContainerWaitResult, RunContainer, RunContainerState } from '@lammps-studio/runtime/ports/ContainerManagerPort';
import { DumpWatch, DumpWatcherPort, DumpWatchHandlers } from '@lammps-studio/runtime/ports/DumpWatcherPort';
import { BuildObserver, ImageBuilderPort, ImageInfo } from '@lammps-studio/runtime/ports/ImageBuilderPort';
import { LogStreamerPort, LogStreamHandle, LogStreamHandlers } from '@lammps-studio/runtime/ports/LogStreamerPort';
import LammpsRuntime from '@lammps-studio/runtime/public/LammpsRuntime';
import { join, posix } from 'node:path';

export const SIGTERM_EXIT = 1;
export const KILL_EXIT = 137;
export const IMAGE_BYTES = 1_200_000_000;

const DUMP_FILE = 'dump.lammpstrj';
const BOX_EDGE = 10;

interface PendingBuild{
    observer: BuildObserver;
    finish: () => void;
    fail: (message: string) => void;
}

interface FakeFrame extends DumpFrame{
    text: string;
}

type WaitResolver = (result: ContainerWaitResult) => void;

export const dumpText = (step: number, atoms: number): string => [
    'ITEM: TIMESTEP',
    String(step),
    'ITEM: NUMBER OF ATOMS',
    String(atoms),
    'ITEM: BOX BOUNDS pp pp pp',
    ...Array.from({ length: 3 }, () => `0 ${BOX_EDGE}`),
    'ITEM: ATOMS id type x y z',
    ...Array.from({ length: atoms }, (_, atom) => `${atom + 1} 1 ${atom % BOX_EDGE} 0 0`),
    ''
].join('\n');

export class FakeContainer{
    readonly output: string[] = [];
    readonly streams = new Set<LogStreamHandlers>();
    readonly exited: Promise<ContainerWaitResult>;
    state: RunContainerState = 'created';
    exitCode: number | null = null;
    startedAt: string | null = null;
    #resolve: WaitResolver = () => undefined;

    constructor(readonly id: string, readonly request: ContainerCreateRequest){
        this.exited = new Promise((resolve) => {
            this.#resolve = resolve;
        });
    }

    print(...lines: string[]){
        for(const line of lines){
            this.output.push(line);
            this.streams.forEach((stream) => stream.onStdout(line));
        }
    }

    exit(exitCode: number){
        if(this.state === 'exited') return;

        this.state = 'exited';
        this.exitCode = exitCode;
        this.#resolve({ exitCode });
    }

    describe(): RunContainer{
        const bind = this.request.binds[0];
        const source = bind.slice(0, bind.lastIndexOf(':'));

        return {
            id: this.id,
            image: this.request.image,
            simulationId: this.request.labels[SIMULATION_LABEL],
            runNumber: Number(this.request.labels[RUN_LABEL]),
            runDir: join(source, posix.relative(CONTAINER_SIMULATION_DIR, this.request.workingDir)),
            state: this.state,
            exitCode: this.exitCode,
            startedAt: this.startedAt
        };
    }
}

export class FakeDocker{
    readonly images = new Map<string, ImageInfo>();
    readonly removedImages: string[] = [];
    readonly containers = new Map<string, FakeContainer>();
    readonly #builds = new Map<string, PendingBuild>();
    readonly #frames = new Map<string, FakeFrame[]>();
    readonly #watchers = new Map<string, Set<DumpWatchHandlers>>();
    #created = 0;
    #generation = 0;
    unreachable = false;

    runtime = (): LammpsRuntime => {
        const generation = this.#generation;

        return new LammpsRuntime({
            logger: logger.raw,
            ports: {
                containerManager: this.#containerManager(generation),
                logStreamer: this.#logStreamer(generation),
                dumpWatcher: this.#dumpWatcher(generation),
                imageBuilder: this.#imageBuilder()
            }
        });
    };

    disconnect(){
        this.#generation += 1;
        this.containers.forEach((container) => container.streams.clear());
        this.#watchers.clear();
    }

    addImage(tag: string){
        this.images.set(tag, { imageId: `sha256:${tag}`, sizeBytes: IMAGE_BYTES });
    }

    isBuilding(tag: string): boolean{
        return this.#builds.has(tag);
    }

    progressBuild(tag: string, progress: BuildProgress){
        this.#pending(tag).observer.progress(progress);
    }

    finishBuild(tag: string){
        this.#pending(tag).finish();
    }

    failBuild(tag: string, message: string){
        this.#pending(tag).fail(message);
    }

    container(simulationId: string, runNumber: number): FakeContainer | undefined{
        return [...this.containers.values()].find(({ request }) => {
            return request.labels[SIMULATION_LABEL] === simulationId && request.labels[RUN_LABEL] === String(runNumber);
        });
    }

    dump(runDir: string, step: number, atoms: number): DumpFrame{
        const frames = this.#frames.get(runDir) ?? [];
        const last = frames.at(-1);
        const frame: FakeFrame = {
            path: join(runDir, DUMP_FILE),
            step,
            index: frames.length,
            atoms,
            byteOffset: last ? last.byteOffset + last.text.length : 0,
            text: dumpText(step, atoms)
        };

        this.#frames.set(runDir, [...frames, frame]);
        this.#watchers.get(runDir)?.forEach((handlers) => handlers.onFrame(frame));
        return frame;
    }

    #pending(tag: string): PendingBuild{
        const pending = this.#builds.get(tag);
        if(!pending) throw new TypeError(`no build of ${tag} is running`);

        return pending;
    }

    #find(container: ContainerHandle): FakeContainer{
        const found = this.containers.get(container.id);
        if(!found) throw Object.assign(new Error('(HTTP code 404) no such container'), { statusCode: 404 });

        return found;
    }

    #alive(generation: number): boolean{
        return generation === this.#generation;
    }

    #containerManager(generation: number): ContainerManagerPort{
        return {
            create: async (request) => {
                this.#created += 1;
                const container = new FakeContainer(`fake${this.#created}`, request);
                this.containers.set(container.id, container);
                return { id: container.id };
            },
            start: async (handle) => {
                const container = this.#find(handle);
                container.state = 'running';
                container.startedAt = new Date().toISOString();
            },
            wait: (handle) => this.#find(handle).exited,
            stop: async (handle) => {
                if(this.#alive(generation)) this.containers.get(handle.id)?.exit(SIGTERM_EXIT);
            },
            remove: async (handle) => {
                if(!this.#alive(generation)) return;

                this.containers.get(handle.id)?.exit(KILL_EXIT);
                this.containers.delete(handle.id);
            },
            inspect: async (id) => this.#find({ id }).describe(),
            list: async () => {
                this.#reach();

                return [...this.containers.values()].map((container) => container.describe());
            }
        };
    }

    #reach(){
        if(this.unreachable) throw Object.assign(new Error('connect ECONNREFUSED /var/run/docker.sock'), { code: 'ECONNREFUSED', syscall: 'connect' });
    }

    #logStreamer(generation: number): LogStreamerPort{
        return {
            stream: async (handle, handlers): Promise<LogStreamHandle> => {
                const container = this.#find(handle);
                const attached = new Promise<void>((resolve) => setImmediate(() => {
                    if(this.#alive(generation)){
                        container.output.forEach((line) => handlers.onStdout(line));
                        container.streams.add(handlers);
                    }
                    resolve();
                }));

                return {
                    ended: Promise.all([attached, container.exited]).then(() => undefined),
                    close: async () => {
                        container.streams.delete(handlers);
                    }
                };
            }
        };
    }

    #dumpWatcher(generation: number): DumpWatcherPort{
        return {
            watch: async (runDir, handlers): Promise<DumpWatch> => {
                const watchers = this.#watchers.get(runDir) ?? new Set();
                this.#watchers.set(runDir, watchers);
                const attached = new Promise<void>((resolve) => setImmediate(() => {
                    if(this.#alive(generation)){
                        (this.#frames.get(runDir) ?? []).forEach((frame) => handlers.onFrame(frame));
                        watchers.add(handlers);
                    }
                    resolve();
                }));

                return {
                    flush: () => attached,
                    close: async () => {
                        watchers.delete(handlers);
                    }
                };
            },
            scan: async (runDir) => [...(this.#frames.get(runDir) ?? [])],
            read: async (path, byteOffset) => {
                const frame = [...this.#frames.values()].flat().find((candidate) => candidate.path === path && candidate.byteOffset === byteOffset);
                if(!frame) throw DumpErrors.NoFrame(`${path}@${byteOffset}`);

                return frame.text;
            }
        };
    }

    #imageBuilder(): ImageBuilderPort{
        return {
            inspect: async (tag) => {
                this.#reach();

                return this.images.get(tag) ?? null;
            },
            build: (build, observer, signal) => new Promise<ImageInfo>((resolve, reject) => {
                const tag = build.tag();
                const settle = () => this.#builds.delete(tag);
                this.#builds.set(tag, {
                    observer,
                    finish: () => {
                        settle();
                        this.addImage(tag);
                        resolve(this.images.get(tag) ?? { imageId: tag, sizeBytes: IMAGE_BYTES });
                    },
                    fail: (message) => {
                        settle();
                        reject(BuildErrors.Failed(message));
                    }
                });
                signal.addEventListener('abort', () => {
                    settle();
                    reject(new DOMException('aborted', 'AbortError'));
                });
            }),
            remove: async (tag) => {
                this.images.delete(tag);
                this.removedImages.push(tag);
            }
        };
    }
}
