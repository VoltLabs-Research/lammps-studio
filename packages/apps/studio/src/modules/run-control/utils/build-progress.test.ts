import { describe, expect, it } from 'vitest';
import { buildFixture, NOW } from '@/modules/run-control/tests/fixtures';
import { buildProgressOf } from '@/modules/run-control/utils/build-progress';

const steps = [
    { name: 'Resolving the build', state: 'done' as const, detail: null },
    { name: 'Configuring with CMake', state: 'done' as const, detail: null },
    { name: 'Compiling', state: 'active' as const, detail: '412 of 1,388 files' },
    { name: 'Installing lmp', state: 'pending' as const, detail: null }
];
const building = buildFixture({ status: 'building', progress: 0.36, steps, output: 'Building CXX object src/CMakeFiles/lammps.dir/atom.cpp.o', createdAt: '2026-11-08T11:57:00.000Z' });
const PACKAGES = ['MANYBODY', 'OPENMP', 'EXTRA-COMPUTE'];

describe('buildProgressOf', () => {
    it('names the packages and the machine under the title', () => {
        expect(buildProgressOf(building, PACKAGES, 'This computer', NOW).sub).toBe('MANYBODY · OPENMP · EXTRA-COMPUTE · This computer');
    });

    it('says what is compiling now and how long is left', () => {
        expect(buildProgressOf(building, PACKAGES, 'This computer', NOW).now).toBe('Compiling 412 of 1,388 files · about 5 min left');
    });

    it('lists every step with its state for the details', () => {
        expect(buildProgressOf(building, PACKAGES, 'This computer', NOW).steps.map((step) => `${step.state}:${step.label}`)).toEqual([
            'done:Resolving the build',
            'done:Configuring with CMake',
            'active:Compiling 412 of 1,388 files',
            'pending:Installing lmp'
        ]);
    });

    it('names the next step between two steps', () => {
        const between = { ...building, steps: steps.map((step) => (step.state === 'active' ? { ...step, state: 'pending' as const } : step)) };

        expect(buildProgressOf(between, PACKAGES, 'atlas', NOW).now).toMatch(/^Compiling 412 of 1,388 files/);
    });

    it('starts empty until the build is known', () => {
        expect(buildProgressOf(null, PACKAGES, 'This computer', NOW)).toMatchObject({ progress: 0, now: '', steps: [] });
    });
});
