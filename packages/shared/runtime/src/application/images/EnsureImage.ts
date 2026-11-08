import Build from '../../domain/build/Build';
import type { BuildResult, BuildSpec } from '../../domain/build/BuildSpec';
import { RuntimeEventMap } from '../../domain/observability/EventMap';
import { BuildErrors } from '../../domain/shared/errors';
import { toError } from '../../domain/shared/toError';
import { EventBusPort } from '../../ports/EventBusPort';
import { ImageBuilderPort } from '../../ports/ImageBuilderPort';
import { Logger } from '../../ports/Logger';

const MS_PER_SECOND = 1000;

interface SharedBuild{
    hash: string;
    promise: Promise<BuildResult>;
    controller: AbortController;
    waiters: number;
}

export default class EnsureImage{
    readonly #inflight = new Map<string, SharedBuild>();

    constructor(
        private readonly imageBuilder: ImageBuilderPort,
        private readonly eventBus: EventBusPort<RuntimeEventMap>,
        private readonly logger: Logger
    ){}

    async execute(spec: BuildSpec, signal?: AbortSignal): Promise<BuildResult>{
        const build = new Build(spec);
        const shared = this.#inflight.get(build.hash()) ?? this.#start(build, spec);

        return await this.#join(shared, signal);
    }

    #start(build: Build, spec: BuildSpec): SharedBuild{
        const controller = new AbortController();
        const shared: SharedBuild = {
            hash: build.hash(),
            promise: this.#run(build, spec, controller.signal),
            controller,
            waiters: 0
        };

        this.#inflight.set(shared.hash, shared);
        return shared;
    }

    async #join(shared: SharedBuild, signal: AbortSignal | undefined): Promise<BuildResult>{
        shared.waiters += 1;
        if(!signal){
            return await shared.promise;
        }

        let onAbort = () => {};
        const aborted = new Promise<never>((_, reject) => {
            onAbort = () => {
                this.#leave(shared);
                reject(BuildErrors.Aborted(shared.hash));
            };
        });

        if(signal.aborted){
            onAbort();
        }

        signal.addEventListener('abort', onAbort, { once: true });

        try{
            return await Promise.race([shared.promise, aborted]);
        }finally{
            signal.removeEventListener('abort', onAbort);
        }
    }

    #leave(shared: SharedBuild){
        shared.waiters -= 1;
        if(shared.waiters === 0){
            shared.controller.abort();
        }
    }

    async #run(build: Build, spec: BuildSpec, signal: AbortSignal): Promise<BuildResult>{
        const { hash, tag } = build.identity();
        this.eventBus.emit('build:start', { ...build.identity(), spec });

        try{
            const result = await this.#buildOrReuse(build, signal);
            this.eventBus.emit('build:end', { result });
            this.logger.info(result.created ? `Image built: ${tag}` : `Image already exists: ${tag}`);

            return result;
        }catch(error){
            const failure = signal.aborted ? BuildErrors.Aborted(hash) : toError(error);
            this.eventBus.emit('build:error', { hash, tag, error: failure.message });
            this.logger.error(`Failed to ensure image ${tag}`, { error: failure.message });
            throw failure;
        }finally{
            this.#inflight.delete(hash);
        }
    }

    async #buildOrReuse(build: Build, signal: AbortSignal): Promise<BuildResult>{
        const identity = build.identity();
        const existing = await this.imageBuilder.inspect(identity.tag);

        if(existing){
            return {
                ...identity,
                ...existing,
                created: false,
                seconds: null
            };
        }

        const startedAt = Date.now();
        const image = await this.imageBuilder.build(build, {
            line: (line) => this.eventBus.emit('build:log', { hash: identity.hash, tag: identity.tag, line }),
            progress: (progress) => this.eventBus.emit('build:progress', { hash: identity.hash, ...progress })
        }, signal);

        return {
            ...identity,
            ...image,
            created: true,
            seconds: (Date.now() - startedAt) / MS_PER_SECOND
        };
    }
}
