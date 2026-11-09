export interface BuildSpec{
    version: string;
    packages: string[];
}

export interface BuildIdentity extends BuildSpec{
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
