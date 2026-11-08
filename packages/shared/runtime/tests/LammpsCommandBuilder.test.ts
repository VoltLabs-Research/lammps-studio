import { describe, expect, it } from 'vitest';
import LammpsCommandBuilder, { CommandInput } from '../src/application/simulations/LammpsCommandBuilder';
import { RunExecution } from '../src/domain/simulation/RunSpec';

const EXECUTION: RunExecution = {
    mpiRanks: 8,
    threadsPerRank: 2,
    gpus: 0,
    accelerator: 'omp'
};

const input = (execution: Partial<RunExecution>, overrides: Partial<CommandInput> = {}): CommandInput => ({
    entry: 'main.in',
    execution: { ...EXECUTION, ...execution },
    variables: {},
    allowRunAsRoot: false,
    ...overrides
});

const builder = new LammpsCommandBuilder();

describe('LammpsCommandBuilder', () => {
    it.each([
        ['omp', input({}), 'mpirun -np 8 lmp -in main.in -sf omp -pk omp 2', { OMP_NUM_THREADS: '2' }],
        ['kokkos', input({ accelerator: 'kokkos', threadsPerRank: 4 }), 'mpirun -np 8 lmp -in main.in -k on t 4 -sf kk', { OMP_NUM_THREADS: '4' }],
        ['gpu', input({ accelerator: 'gpu', gpus: 2 }), 'mpirun -np 8 lmp -in main.in -sf gpu -pk gpu 2', {}],
        ['gpu without a count', input({ accelerator: 'gpu', gpus: 0 }), 'mpirun -np 8 lmp -in main.in -sf gpu -pk gpu 1', {}],
        ['intel', input({ accelerator: 'intel' }), 'mpirun -np 8 lmp -in main.in -sf intel', {}],
        ['opt', input({ accelerator: 'opt' }), 'mpirun -np 8 lmp -in main.in -sf opt', {}],
        ['none', input({ accelerator: 'none', mpiRanks: 1 }), 'mpirun -np 1 lmp -in main.in', {}]
    ])('runs the %s accelerator', (_, command, expected, env) => {
        const built = builder.build(command);

        expect(built.argv.join(' ')).toBe(expected);
        expect(built.env).toEqual(env);
    });

    it('passes each override with -var, skipping empty ones and splitting index lists', () => {
        const built = builder.build(input({ accelerator: 'none' }, { variables: { T: '400', seed: ' ', temps: '300 400 500' } }));

        expect(built.argv).toEqual(['mpirun', '-np', '8', 'lmp', '-in', 'main.in', '-var', 'T', '400', '-var', 'temps', '300', '400', '500']);
    });

    it('adds --allow-run-as-root when the container runs as root', () => {
        const built = builder.build(input({ accelerator: 'none' }, { allowRunAsRoot: true, entry: 'water.lmp' }));

        expect(built.argv.join(' ')).toBe('mpirun --allow-run-as-root -np 8 lmp -in water.lmp');
    });

    it('keeps a value with shell characters as one argument instead of quoting it', () => {
        const built = builder.build(input({ accelerator: 'none' }, { variables: { name: "it's;$HOME" } }));

        expect(built.argv.slice(-3)).toEqual(['-var', 'name', "it's;$HOME"]);
    });
});
