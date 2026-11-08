import type { Accelerator } from '../shared/types';

export interface BuildSpec{
    version: string;
    packages: string[];
    accelerator: Accelerator;
}

export interface BuildIdentity{
    key: string;
    hash: string;
    tag: string;
}

export interface BuildResult extends BuildIdentity{
    created: boolean;
    imageId: string;
    sizeBytes: number;
    seconds: number | null;
}
