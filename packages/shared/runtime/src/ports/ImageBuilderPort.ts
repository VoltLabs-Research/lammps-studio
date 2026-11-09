import Build from '../domain/build/Build';
import type { BuildProgress } from '../domain/build/BuildStage';

export interface ImageInfo{
    imageId: string;
    sizeBytes: number;
}

export interface BuildObserver{
    line(line: string): void;
    progress(progress: BuildProgress): void;
}

export interface ImageBuilderPort{
    inspect(tag: string): Promise<ImageInfo | null>;
    build(build: Build, observer: BuildObserver, signal: AbortSignal): Promise<ImageInfo>;
    remove(tag: string): Promise<void>;
}
