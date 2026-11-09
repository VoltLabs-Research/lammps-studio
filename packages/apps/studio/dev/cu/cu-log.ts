import type { RunConfig } from '@lammps-studio/contracts/run/domain';
import { runCommand } from '@lammps-studio/lammps/command/run-command';
import { META_PREFIX } from '@lammps-studio/lammps/log/domain';
import { formatInt } from '../../src/shared/utils/format';
import { RESTART_EVERY, STEPS_EQ, STEPS_RUN, WIRE } from './cu-model';
import { COLS_EQ, COLS_RUN, equilibrationRow, tensionRow } from './cu-thermo';

export interface LogContext{
    runNumber: number;
    machineName: string;
    buildHash: string;
    config: RunConfig;
}

interface TimingRow{
    section: string;
    min: number;
    avg: number;
    max: number;
    variance: string;
    share: string;
}

interface LoopTiming{
    steps: number;
    seconds: number;
    stepsPerSecond: number;
}

export const MISSING_PACKAGE = 'Unrecognized pair style \'eam/alloy\' is part of the MANYBODY package which is not enabled in this LAMMPS binary.';
export const NEIGHBOR_OVERFLOW = 'Neighbor list overflow, boost neigh_modify one';

const CONTAINER_ID = '7c1e9a42';
const CONTAINER_INPUT = '/workspace/input/';
const SIGNIFICANT_DIGITS = 8;
const TIMESTEP_PS = 0.001;
const SECONDS_PER_DAY = 86400;
const PS_PER_NS = 1000;
const HOURS_PER_DAY = 24;
const ATOM_STEPS_PER_MEGA = 1e6;
const CELL_WIDTH = 10;
const SHARE_WIDTH = 5;

const EQUILIBRATION_LOOP: LoopTiming = { steps: STEPS_EQ, seconds: 31.2103, stepsPerSecond: 640.814 };
const TENSION_LOOP: LoopTiming = { steps: STEPS_RUN, seconds: 780.391, stepsPerSecond: 640.705 };
const TOTAL_WALL_TIME = '0:13:31';
const TOTAL_WALL_TEXT = '13 min 31 s';
const OTHER_SHARE = 0.0273;

const TIMING_ROWS: TimingRow[] = [
    { section: 'Pair', min: 0.772, avg: 0.785, max: 0.801, variance: '5.2', share: '78.53' },
    { section: 'Neigh', min: 0.0266, avg: 0.027, max: 0.0275, variance: '0.9', share: '2.70' },
    { section: 'Comm', min: 0.0635, avg: 0.0782, max: 0.0915, variance: '18.4', share: '7.82' },
    { section: 'Output', min: 0.0007, avg: 0.0008, max: 0.001, variance: '0.0', share: '0.08' },
    { section: 'Modify', min: 0.0748, avg: 0.0814, max: 0.0887, variance: '9.1', share: '8.14' }
];

const CNA_WARNINGS = new Map([
    [150000, 3],
    [172000, 5]
]);

const formatG = (value: number): string => (Number.isFinite(value) ? String(Number(value.toPrecision(SIGNIFICANT_DIGITS))) : 'nan');

const thermoHeader = (columns: string[]): string => `   ${columns[0].padEnd(7)}${columns.slice(1).map((column) => column.padStart(9).padEnd(15)).join('')}`;

const thermoLine = (row: number[]): string => {
    const values = row.slice(1).map((value) => ` ${`${value >= 0 ? ' ' : ''}${formatG(value)}`.padEnd(14)}`);

    return `${String(row[0]).padStart(10)}${values.join('')}`;
};

const commandLines = (config: RunConfig): string[] => {
    const command = runCommand(config, null).replace(`-in ${config.entry}`, `-in ${CONTAINER_INPUT}${config.entry}`);

    return command.split('\n').map((line) => `${META_PREFIX}${line}`);
};

export const startLines = ({ runNumber, machineName, buildHash, config }: LogContext): string[] => [
    `${META_PREFIX}run ${runNumber} on ${machineName} · build ${buildHash}`,
    `${META_PREFIX}container lammps-${CONTAINER_ID} started · ${config.mpiRanks} MPI × ${config.threadsPerRank} OpenMP`,
    ...commandLines(config),
    'LAMMPS (22 Jul 2025 - Update 1)',
    `  using ${config.threadsPerRank} OpenMP thread(s) per MPI task`,
    'Lattice spacing in x,y,z = 3.615 3.615 3.615',
    'Created orthogonal box = (-36.15 -36.15 0) to (36.15 36.15 144.6)',
    '  2 by 2 by 2 MPI processor grid',
    `Created ${WIRE.count} atoms`,
    '  using lattice units in orthogonal box = (-36.15 -36.15 0) to (36.15 36.15 144.6)',
    '  create_atoms CPU = 0.002 seconds'
];

export const missingPackageLines = (): string[] => [
    `ERROR: ${MISSING_PACKAGE} (src/force.cpp:275)`,
    'Last command: pair_style      eam/alloy',
    `${META_PREFIX}LAMMPS exited with code 1 · container removed`
];

export const setupLines = (): string[] => [
    'Reading eam/alloy potential file potentials/Cu01.eam.alloy with DATE: 2007-10-12',
    'Neighbor list info ...',
    '  update: every = 1 steps, delay = 0 steps, check = yes',
    '  max neighbors/atom: 2000, page size: 100000',
    '  master list distance cutoff = 7.50679',
    '  ghost atom cutoff = 7.50679',
    '  binsize = 3.753395, bins = 20 20 39',
    '  2 neighbor lists, perpetual/occasional/extra = 1 1 0',
    '  (1) pair eam/alloy/omp, perpetual',
    '      attributes: half, newton on, omp',
    '  (2) compute cna/atom, occasional',
    '      attributes: full, newton on',
    'Setting up Verlet run ...',
    '  Unit style    : metal',
    '  Current step  : 0',
    '  Time step     : 0.001',
    'Per MPI rank memory allocation (min/avg/max) = 4.112 | 4.118 | 4.125 Mbytes',
    thermoHeader(COLS_EQ)
];

export const equilibrationLine = (step: number): string => thermoLine(equilibrationRow(step));

export const tensionLine = (step: number): string => thermoLine(tensionRow(step));

const cell = (seconds: number): string => seconds.toFixed(4).padEnd(CELL_WIDTH);

const timingRowLine = ({ section, min, avg, max, variance, share }: TimingRow, loop: number): string =>
    `${section.padEnd(8)}| ${cell(loop * min)} | ${cell(loop * avg)} | ${cell(loop * max)} | ${variance.padStart(SHARE_WIDTH)} | ${share.padStart(SHARE_WIDTH)}`;

const timingLines = ({ steps, seconds, stepsPerSecond }: LoopTiming, config: RunConfig): string[] => {
    const nsPerDay = (stepsPerSecond * TIMESTEP_PS * SECONDS_PER_DAY) / PS_PER_NS;
    const procs = config.mpiRanks * config.threadsPerRank;
    const matomSteps = (stepsPerSecond * WIRE.count) / ATOM_STEPS_PER_MEGA;

    return [
        `Loop time of ${seconds} on ${procs} procs for ${steps} steps with ${WIRE.count} atoms`,
        '',
        `Performance: ${nsPerDay.toFixed(3)} ns/day, ${(HOURS_PER_DAY / Number(nsPerDay.toFixed(3))).toFixed(3)} hours/ns, ${stepsPerSecond.toFixed(3)} timesteps/s, ${matomSteps.toFixed(1)} Matom-step/s`,
        `99.1% CPU use with ${config.mpiRanks} MPI tasks x ${config.threadsPerRank} OpenMP threads`,
        '',
        'MPI task timing breakdown:',
        'Section |  min time  |  avg time  |  max time  |%varavg| %total',
        '---------------------------------------------------------------',
        ...TIMING_ROWS.map((row) => timingRowLine(row, seconds)),
        `Other   |            | ${cell(seconds * OTHER_SHARE)} |            |       |  2.73`,
        '',
        'Nlocal:         2223 ave        2301 max        2164 min',
        'Nghost:       2891.5 ave        3012 max        2790 min',
        'Neighs:        93710 ave       97048 max       90233 min',
        ''
    ];
};

export const equilibrationEndLines = (config: RunConfig): string[] => [
    ...timingLines(EQUILIBRATION_LOOP, config),
    'Setting up Verlet run ...',
    '  Unit style    : metal',
    '  Current step  : 0',
    '  Time step     : 0.001',
    'Per MPI rank memory allocation (min/avg/max) = 5.237 | 5.244 | 5.251 Mbytes',
    thermoHeader(COLS_RUN)
];

export const warningLines = (step: number): string[] => {
    const atoms = CNA_WARNINGS.get(step);
    if(atoms === undefined) return [];

    return [`WARNING: Too many neighbors in CNA for ${atoms} atoms (src/compute_cna_atom.cpp)`];
};

export const finishLines = ({ runNumber, config }: LogContext): string[] => [
    ...timingLines(TENSION_LOOP, config),
    `Total wall time: ${TOTAL_WALL_TIME}`,
    `${META_PREFIX}run ${runNumber} completed · exit code 0 · ${TOTAL_WALL_TEXT}`
];

export const failLines = (step: number): string[] => [
    `ERROR on proc 5: ${NEIGHBOR_OVERFLOW} (src/npair.cpp)`,
    'Last command: run             500000',
    `${META_PREFIX}LAMMPS exited with code 1 near step ${formatInt(step)} · container removed`
];

export const stopRequestedLine = (): string => `${META_PREFIX}stop requested · docker stop, 10 s grace`;

export const stoppedLines = ({ runNumber }: LogContext, step: number): string[] => [
    `${META_PREFIX}LAMMPS received SIGTERM near step ${formatInt(step)}`,
    `${META_PREFIX}run ${runNumber} stopped · last restart file restart.${Math.floor(step / RESTART_EVERY) * RESTART_EVERY}.cu`
];

export const killedLine = (step: number): string => `${META_PREFIX}killed at step ${formatInt(step)} · docker kill`;
