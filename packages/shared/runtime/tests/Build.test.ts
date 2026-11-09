import { describe, expect, it } from 'vitest';
import Build from '../src/domain/build/Build';
import { BuildSpec } from '../src/domain/build/BuildSpec';
import { cmakeArguments, renderDockerfile } from '../src/infrastructure/docker/renderDockerfile';

const spec = (overrides: Partial<BuildSpec>): BuildSpec => ({
    version: 'stable_22Jul2025_update1',
    packages: ['MANYBODY', 'OPENMP'],
    ...overrides
});

describe('Build identity', () => {
    it.each([
        [['MANYBODY', 'OPENMP'], ['OPENMP', 'MANYBODY']],
        [['KSPACE', 'MOLECULE', 'RIGID'], ['RIGID', 'KSPACE', 'MOLECULE']],
        [['manybody', ' OPENMP '], ['OPENMP', 'MANYBODY', 'MANYBODY']]
    ])('gives %j and %j the same key and hash', (left, right) => {
        const a = new Build(spec({ packages: left }));
        const b = new Build(spec({ packages: right }));

        expect(a.key()).toBe(b.key());
        expect(a.hash()).toBe(b.hash());
    });

    it.each([
        ['version', spec({ version: 'stable_29Aug2024' })],
        ['packages', spec({ packages: ['MANYBODY'] })]
    ])('changes the hash when the %s changes', (_, changed) => {
        expect(new Build(changed).hash()).not.toBe(new Build(spec({})).hash());
    });

    it('describes itself with the trimmed version and the normalized package list it hashes', () => {
        const build = new Build(spec({ version: ' stable_22Jul2025_update1 ', packages: ['openmp', ' MANYBODY', 'OPENMP'] }));

        expect(build.identity()).toEqual({
            version: 'stable_22Jul2025_update1',
            packages: ['MANYBODY', 'OPENMP'],
            key: 'stable_22Jul2025_update1|MANYBODY,OPENMP',
            hash: build.hash(),
            tag: build.tag()
        });
    });

    it('keys and tags the image from the sorted package list', () => {
        const build = new Build(spec({ packages: ['OPENMP', 'MANYBODY'] }));

        expect(build.key()).toBe('stable_22Jul2025_update1|MANYBODY,OPENMP');
        expect(build.hash()).toMatch(/^[0-9a-f]{12}$/);
        expect(build.tag()).toBe(`lammps/lammps-runtime:${build.hash()}`);
    });
});

describe('the LAMMPS image recipe', () => {
    it('enables MPI, each package and OpenMP threading when OPENMP is in the set', () => {
        const args = cmakeArguments(new Build(spec({ packages: ['OPENMP', 'MANYBODY'] })));

        expect(args).toEqual(expect.arrayContaining(['-DBUILD_MPI=yes', '-DBUILD_OMP=yes', '-DPKG_MANYBODY=yes', '-DPKG_OPENMP=yes']));
    });

    it('turns threading on for KOKKOS with the OpenMP backend and off for a plain set', () => {
        expect(cmakeArguments(new Build(spec({ packages: ['KOKKOS'] }))))
            .toEqual(expect.arrayContaining(['-DBUILD_OMP=yes', '-DKokkos_ENABLE_OPENMP=yes']));
        expect(cmakeArguments(new Build(spec({ packages: ['MANYBODY'] }))))
            .toContain('-DBUILD_OMP=no');
    });

    it('starts from Ubuntu 24.04, or the CUDA image when GPU is in the set', () => {
        expect(renderDockerfile(new Build(spec({}))).text).toMatch(/^FROM ubuntu:24\.04\n/);
        expect(renderDockerfile(new Build(spec({ packages: ['GPU'] }))).text).toMatch(/^FROM nvidia\/cuda:[^\n]+-devel-ubuntu24\.04\n/);
    });

    it('clones the requested ref and installs lmp onto the PATH', () => {
        const { text } = renderDockerfile(new Build(spec({ version: 'develop' })));

        expect(text).toContain("git clone --depth 1 --branch 'develop' https://github.com/lammps/lammps.git");
        expect(text).toContain("'-DCMAKE_INSTALL_PREFIX=/usr/local'");
        expect(text).toContain('cmake --install');
    });
});
