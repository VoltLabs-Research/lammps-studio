import Build from '../domain/build/Build';
import type { BuildResult } from '../domain/build/Build';

export interface ImageBuilderPort{
    exists(tag: string): Promise<boolean>;
    build(build: Build, onProgress: (message: string) => void): Promise<BuildResult>;
}
