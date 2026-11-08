import { Run } from '@lammps-studio/contracts/run/domain';
import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { applyRun, useSimulationsStore } from '@/shared/store/simulations';
import { beforeEach, describe, expect, it } from 'vitest';

const simulation = (id: string, runNumber: number | null): Simulation => ({
    id,
    name: id,
    machineId: 'local',
    folder: id,
    entry: 'main.in',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    hasPreview: false,
    lastRun: runNumber === null ? null : {
        number: runNumber,
        state: 'completed',
        startedAt: '2026-11-01T10:00:00.000Z',
        endedAt: '2026-11-01T10:05:00.000Z',
        progress: { step: 1000, totalSteps: 1000, section: 1, sections: 1, stepsPerSecond: null },
        error: null
    }
});

const run = (simulationId: string, number: number, step: number): Run => ({
    simulationId,
    number,
    state: 'running',
    startedAt: '2026-11-01T11:00:00.000Z',
    endedAt: null,
    progress: { step, totalSteps: 5000, section: 1, sections: 1, stepsPerSecond: 120 },
    error: null,
    config: {
        machineId: 'local',
        version: 'stable',
        packages: [],
        accelerator: 'none',
        mpiRanks: 1,
        threadsPerRank: 1,
        gpus: 0,
        slurm: null,
        entry: 'main.in',
        variables: {}
    },
    buildHash: '3f9a0c21b7e4',
    outputDir: 'runs/run-2',
    frames: 0,
    warnings: 0
});

describe('simulations store', () => {
    beforeEach(() => {
        useSimulationsStore.setState({ items: [simulation('cu', 1), simulation('lj', null)], status: 'ready', error: null });
    });

    it('replaces a simulation in place and appends a new one', () => {
        const { upsert } = useSimulationsStore.getState();
        upsert({ ...simulation('cu', 1), name: 'Cu wire' });
        upsert(simulation('fe', null));

        expect(useSimulationsStore.getState().items.map((item) => item.name)).toEqual(['Cu wire', 'lj', 'fe']);
    });

    it('removes a simulation', () => {
        useSimulationsStore.getState().remove('cu');

        expect(useSimulationsStore.getState().items.map((item) => item.id)).toEqual(['lj']);
    });

    it('takes a newer run as the last run of its simulation', () => {
        applyRun(run('cu', 2, 1200));

        const [cu, lj] = useSimulationsStore.getState().items;
        expect(cu.lastRun).toMatchObject({ number: 2, state: 'running', progress: { step: 1200 } });
        expect(cu.lastRun).not.toHaveProperty('config');
        expect(lj.lastRun).toBeNull();
    });

    it('ignores an update for an older run', () => {
        applyRun(run('cu', 2, 1200));
        applyRun(run('cu', 1, 50));

        expect(useSimulationsStore.getState().items[0].lastRun).toMatchObject({ number: 2 });
    });
});
