import type { Run, RunConfig } from '@lammps-studio/contracts/run/domain';
import { describe, expect, it } from 'vitest';
import { runGroups, runResources, runRow, runsSub, runStatus } from '@/modules/runs/utils/run-rows';

const OPENMP: RunConfig = {
    machineId: 'local',
    version: 'stable',
    packages: ['MANYBODY', 'OPENMP'],
    accelerator: 'omp',
    mpiRanks: 8,
    threadsPerRank: 2,
    gpus: 0,
    slurm: null,
    entry: 'main.in',
    variables: {}
};

const NOW = new Date(2026, 10, 9, 12, 30).getTime();
const today = (hour: number, minute: number): string => new Date(2026, 10, 9, hour, minute).toISOString();

const run = (number: number, patch: Partial<Run>): Run => ({
    simulationId: 'cu',
    number,
    state: 'running',
    startedAt: today(12, 18),
    endedAt: null,
    progress: { step: 184000, totalSteps: 500000, section: 2, sections: 2, stepsPerSecond: 640 },
    error: null,
    config: OPENMP,
    buildHash: '3f9a0c21b7e4',
    outputDir: `runs/run-${number}`,
    frames: 0,
    warnings: 0,
    ...patch
});

describe('the resources a run used', () => {
    it('names ranks and threads by accelerator', () => {
        expect(runResources(OPENMP)).toBe('8 MPI × 2 OpenMP');
        expect(runResources({ ...OPENMP, accelerator: 'kokkos' })).toBe('8 MPI × 2 Kokkos');
        expect(runResources({ ...OPENMP, accelerator: 'gpu', mpiRanks: 4, gpus: 1 })).toBe('4 MPI · 1 GPU');
        expect(runResources({ ...OPENMP, accelerator: 'none', threadsPerRank: 1 })).toBe('8 MPI');
    });
});

describe('a run row', () => {
    it('shows the step of the last run command and a progress ring while running', () => {
        const row = runRow(run(3, {}), null);

        expect(row.sub).toBe('Step 184,000 of 500,000 · 8 MPI × 2 OpenMP');
        expect(row.status).toEqual({ kind: 'progress', fraction: 0.368 });
        expect(row.disabled).toBe(false);
        expect(row.folder).toBe('runs/run-3');
    });

    it('names the section while an earlier run command is going', () => {
        const progress = { step: 12000, totalSteps: 20000, section: 1, sections: 2, stepsPerSecond: 640 };

        expect(runRow(run(3, { progress }), null).sub).toBe('Section 1 of 2 · step 12,000 of 20,000 · 8 MPI × 2 OpenMP');
    });

    it('says where a stopped run stopped', () => {
        const row = runRow(run(2, { state: 'cancelled', progress: { step: 96000, totalSteps: 500000, section: 2, sections: 2, stepsPerSecond: null } }), null);

        expect(row.sub).toBe('Stopped at step 96,000 · 8 MPI × 2 OpenMP');
        expect(row.status).toEqual({ kind: 'word', word: 'Stopped', danger: false });
    });

    it('gives a failed run its error and the step, in danger ink', () => {
        const error = { message: 'Neighbor list overflow, boost neigh_modify one.', step: 231400, line: null };
        const row = runRow(run(3, { state: 'failed', error }), null);

        expect(row.sub).toBe('Neighbor list overflow, boost neigh_modify one at step 231,400 · 8 MPI × 2 OpenMP');
        expect(runStatus(run(3, { state: 'failed', error }))).toEqual({ kind: 'word', word: 'Failed', danger: true });
    });

    it('sums up a completed run in steps and wall time', () => {
        const progress = { step: 500000, totalSteps: 500000, section: 2, sections: 2, stepsPerSecond: null };
        const row = runRow(run(3, { state: 'completed', progress, startedAt: today(12, 0), endedAt: today(12, 13) }), null);

        expect(row.sub).toBe('500,000 steps in 13 min · 8 MPI × 2 OpenMP');
        expect(row.status).toEqual({ kind: 'word', word: 'Completed', danger: false });
    });

    it('waits on the build with its progress and cannot be opened yet', () => {
        const row = runRow(run(4, { state: 'building' }), 0.36);

        expect(row.sub).toBe('Waiting for the build · 36% · 8 MPI × 2 OpenMP');
        expect(row.disabled).toBe(true);
        expect(runRow(run(4, { state: 'starting' }), null).disabled).toBe(true);
    });
});

describe('the runs list', () => {
    it('groups runs by the day they started, newest first', () => {
        const runs = [
            run(1, { state: 'failed', startedAt: new Date(2026, 10, 8, 18, 5).toISOString() }),
            run(2, { state: 'cancelled', startedAt: today(11, 2) }),
            run(3, {})
        ];
        const groups = runGroups(runs, { now: NOW, buildProgress: () => null });

        expect(groups.map((group) => [group.title, group.rows.map((row) => row.number)])).toEqual([['Today', [3, 2]], ['Yesterday', [1]]]);
    });

    it('looks up the build progress by the run’s build hash', () => {
        const runs = [run(4, { state: 'building', buildHash: 'c47b19d2e530' })];
        const groups = runGroups(runs, { now: NOW, buildProgress: (hash) => (hash === 'c47b19d2e530' ? 0.5 : null) });

        expect(groups[0].rows[0].sub).toBe('Waiting for the build · 50% · 8 MPI × 2 OpenMP');
    });

    it('counts the runs in the panel head', () => {
        expect(runsSub(3)).toBe('3 runs');
        expect(runsSub(1)).toBe('1 run');
    });
});
