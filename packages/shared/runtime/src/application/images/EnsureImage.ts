import Build from '../../domain/build/Build';
import type { BuildResult, BuildSpec } from '../../domain/build/BuildSpec';
import { RuntimeEventMap } from '../../domain/observability/EventMap';
import { EventBusPort } from '../../ports/EventBusPort';
import { ImageBuilderPort } from '../../ports/ImageBuilderPort';
import { Logger } from '../../ports/Logger';
import { toError } from '../../domain/shared/toError';

const MS_PER_SECOND = 1000;

export default class EnsureImage{
    constructor(
        private readonly imageBuilder: ImageBuilderPort,
        private readonly eventBus: EventBusPort<RuntimeEventMap>,
        private readonly logger: Logger
    ){}

    async execute(spec: BuildSpec): Promise<BuildResult>{
        const build = new Build(spec);
        const { hash, tag } = build.identity();

        this.eventBus.emit('build:start', { ...build.identity(), spec });

        try{
            const result = await this.buildOrReuse(build);
            this.eventBus.emit('build:end', { result });
            this.logger.info(result.created ? `Image built: ${tag}` : `Image already exists: ${tag}`);

            return result;
        }catch(error){
            const message = toError(error).message;
            this.eventBus.emit('build:error', { hash, tag, error: message });
            this.logger.error(`Failed to ensure image ${tag}`, { error: message });
            throw error;
        }
    }

    private async buildOrReuse(build: Build): Promise<BuildResult>{
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
        const image = await this.imageBuilder.build(build, (line) => {
            this.eventBus.emit('build:log', { hash: identity.hash, tag: identity.tag, line });
        });

        return {
            ...identity,
            ...image,
            created: true,
            seconds: (Date.now() - startedAt) / MS_PER_SECOND
        };
    }
}
