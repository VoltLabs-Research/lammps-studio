import crypto from 'node:crypto';
import type { BuildIdentity, BuildSpec } from './BuildSpec';

const IMAGE_REPOSITORY = 'lammps/lammps-runtime';
const HASH_LENGTH = 12;

const normalizePackages = (packages: string[]): string[] => {
    const names = packages
        .map((name) => name.trim().toUpperCase())
        .filter((name) => name.length > 0);

    return [...new Set(names)].sort();
};

export default class Build{
    readonly version: string;
    readonly packages: string[];

    constructor(spec: BuildSpec){
        this.version = spec.version.trim();
        this.packages = normalizePackages(spec.packages);
    }

    has(name: string): boolean{
        return this.packages.includes(name);
    }

    key(): string{
        return `${this.version}|${this.packages.join(',')}`;
    }

    hash(): string{
        return crypto.createHash('sha256').update(this.key()).digest('hex').slice(0, HASH_LENGTH);
    }

    tag(): string{
        return `${IMAGE_REPOSITORY}:${this.hash()}`;
    }

    identity(): BuildIdentity{
        return {
            version: this.version,
            packages: this.packages,
            key: this.key(),
            hash: this.hash(),
            tag: this.tag()
        };
    }
}
