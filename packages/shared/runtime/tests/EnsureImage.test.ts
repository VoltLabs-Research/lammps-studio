import { describe, expect, it } from 'vitest';
import EnsureImage from '../src/application/images/EnsureImage';
import Build from '../src/domain/build/Build';
import { BuildSpec } from '../src/domain/build/BuildSpec';
import { RuntimeEventMap } from '../src/domain/observability/EventMap';
import EventEmitterBus from '../src/infrastructure/events/EventEmitterBus';
import { BuildObserver, ImageBuilderPort, ImageInfo } from '../src/ports/ImageBuilderPort';
import { Logger } from '../src/ports/Logger';

const SPEC: BuildSpec = {
    version: 'stable_22Jul2025_update1',
    packages: ['MANYBODY', 'OPENMP']
};

const IMAGE: ImageInfo = {
    imageId: 'sha256:abc',
    sizeBytes: 1
};

const silent: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    child: () => silent
};

class GatedBuilder implements ImageBuilderPort{
    builds = 0;
    signals: AbortSignal[] = [];
    #release: (image: ImageInfo) => void = () => undefined;

    async inspect(): Promise<ImageInfo | null>{
        return null;
    }

    build(_: Build, __: BuildObserver, signal: AbortSignal): Promise<ImageInfo>{
        this.builds += 1;
        this.signals.push(signal);
        return new Promise((resolve, reject) => {
            this.#release = resolve;
            signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
    }

    async remove(){}

    finish(){
        this.#release(IMAGE);
    }
}

const setup = () => {
    const builder = new GatedBuilder();
    const ensureImage = new EnsureImage(builder, new EventEmitterBus<RuntimeEventMap>(), silent);
    return { builder, ensureImage };
};

const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
};

describe('concurrent builds', () => {
    it('shares one docker build between callers asking for the same packages in any order', async () => {
        const { builder, ensureImage } = setup();
        const first = ensureImage.execute(SPEC);
        const second = ensureImage.execute({ ...SPEC, packages: ['OPENMP', 'MANYBODY'] });

        await settle();
        builder.finish();
        const [a, b] = await Promise.all([first, second]);

        expect(builder.builds).toBe(1);
        expect(a).toEqual(b);
        expect(a.created).toBe(true);
    });

    it('starts a separate build for a different hash', async () => {
        const { builder, ensureImage } = setup();
        void ensureImage.execute(SPEC);
        void ensureImage.execute({ ...SPEC, packages: ['KOKKOS', 'MANYBODY'] });

        await settle();

        expect(builder.builds).toBe(2);
    });

    it('keeps building while another caller still waits, and cancels once the last one aborts', async () => {
        const { builder, ensureImage } = setup();
        const one = new AbortController();
        const two = new AbortController();
        const first = ensureImage.execute(SPEC, one.signal);
        const second = ensureImage.execute(SPEC, two.signal);
        await settle();

        one.abort();
        await expect(first).rejects.toMatchObject({ code: `Build::Aborted:${new Build(SPEC).hash()}` });
        expect(builder.signals[0].aborted).toBe(false);

        two.abort();
        await expect(second).rejects.toMatchObject({ code: `Build::Aborted:${new Build(SPEC).hash()}` });
        expect(builder.signals[0].aborted).toBe(true);
    });

    it('rejects immediately for a signal that is already aborted', async () => {
        const { ensureImage } = setup();
        const controller = new AbortController();
        controller.abort();

        await expect(ensureImage.execute(SPEC, controller.signal)).rejects.toMatchObject({ code: expect.stringMatching(/^Build::Aborted/) });
    });

    it('builds again after an aborted build instead of reusing it', async () => {
        const { builder, ensureImage } = setup();
        const controller = new AbortController();
        const aborted = ensureImage.execute(SPEC, controller.signal);
        await settle();
        controller.abort();
        await expect(aborted).rejects.toBeDefined();
        await settle();

        const retry = ensureImage.execute(SPEC);
        await settle();
        builder.finish();

        expect((await retry).created).toBe(true);
        expect(builder.builds).toBe(2);
    });
});
