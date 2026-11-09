import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { STEPS_RUN, THERMO_EVERY } from './cu/cu-model';
import { BUILD_PROGRESS_PER_SECOND, newBuild } from './fake-builds';
import { STOP_GRACE_TICKS } from './fake-clock';
import { CU_LIVE_RUN, cuRun, liveCuRun, pastCuRuns, replayedCuRun, tensionSeconds } from './fake-cu-history';
import { failCu, stopCu, TENSION } from './fake-cu-run';
import { configFor, LOCAL_MACHINE } from './fake-data';
import { applyChange, recordOf, RunRecord } from './fake-runs';

export const SCENARIOS = ['idle', 'building', 'running', 'stopping', 'finished', 'failed', 'noscript'] as const;

export type Scenario = typeof SCENARIOS[number];

export interface CuScenario{
    runs: RunRecord[];
    builds: Build[];
}

const MS_PER_SECOND = 1000;
const LIVE_STEP = 184000;
const FAIL_STEP = 231400;
const BUILD_PROGRESS = 0.36;
const BUILD_HASH = '9e47d1a3b25f';
const BUILD_PACKAGES = ['MANYBODY', 'OPENMP', 'EXTRA-COMPUTE'];

export const isScenario = (value: unknown): value is Scenario => SCENARIOS.some((scenario) => scenario === value);

const iso = (ms: number): string => new Date(ms).toISOString();

const live = (machines: Machine[], now: number): RunRecord => liveCuRun(machines, now, { section: TENSION, step: LIVE_STEP });

const stopping = (machines: Machine[], now: number): RunRecord => {
    const record = live(machines, now);
    applyChange(record, stopCu());
    record.wait = STOP_GRACE_TICKS;

    return record;
};

const ended = (machines: Machine[], now: number, step: number): RunRecord => {
    const target = { section: TENSION, step: Math.floor(step / THERMO_EVERY) * THERMO_EVERY };

    return replayedCuRun(machines, now - tensionSeconds(step) * MS_PER_SECOND, target, now);
};

const failed = (machines: Machine[], now: number): RunRecord => {
    const record = ended(machines, now, FAIL_STEP);
    applyChange(record, failCu(record, FAIL_STEP, iso(now)));

    return record;
};

const waitingBuild = (now: number): Build => newBuild({
    machine: LOCAL_MACHINE,
    version: 'stable',
    packages: BUILD_PACKAGES,
    hash: BUILD_HASH,
    createdAt: iso(now - (BUILD_PROGRESS / BUILD_PROGRESS_PER_SECOND) * MS_PER_SECOND),
    progress: BUILD_PROGRESS,
    usedBy: 1
});

const building = (build: Build): RunRecord => {
    const record = recordOf(cuRun(CU_LIVE_RUN, configFor(LOCAL_MACHINE.id, BUILD_PACKAGES), build.hash, build.createdAt));
    applyChange(record, { patch: { state: 'building' }, lines: [], frames: [] });

    return record;
};

const latestRun = (scenario: Scenario, machines: Machine[], now: number): RunRecord | null => {
    if(scenario === 'idle' || scenario === 'building') return null;
    if(scenario === 'stopping') return stopping(machines, now);
    if(scenario === 'finished') return ended(machines, now, STEPS_RUN);
    if(scenario === 'failed') return failed(machines, now);

    return live(machines, now);
};

export const cuScenario = (scenario: Scenario, machines: Machine[], now: number): CuScenario => {
    const past = pastCuRuns(machines, now);
    if(scenario === 'building'){
        const build = waitingBuild(now);

        return { runs: [...past, building(build)], builds: [build] };
    }

    const latest = latestRun(scenario, machines, now);

    return { runs: latest ? [...past, latest] : past, builds: [] };
};
