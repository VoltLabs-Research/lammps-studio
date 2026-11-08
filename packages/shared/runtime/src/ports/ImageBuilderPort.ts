import Build from '../domain/build/Build';

export interface ImageInfo{
    imageId: string;
    sizeBytes: number;
}

export interface ImageBuilderPort{
    inspect(tag: string): Promise<ImageInfo | null>;
    build(build: Build, onLine: (line: string) => void): Promise<ImageInfo>;
}
