import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { BuildState } from '@/modules/run-settings/domain/settings';

const NO_SCHEDULER = 'no scheduler, runs directly';
const SCHEDULER_PARTS = ' · ';
const CORE_ONLY = 'Core only';
const FALLBACK_MINUTES = 7;

export const folderOf = (machine: Machine, folder: string): string => `${machine.root}/${folder}`;

export const machineFoot = (machine: Machine): string => {
    const scheduler = machine.scheduler === null ? NO_SCHEDULER : machine.scheduler.split(SCHEDULER_PARTS)[0];

    return `${machine.runtime} · ${scheduler}`;
};

export const packagesText = (physics: string[]): string => (physics.length === 0 ? CORE_ONLY : physics.join(', '));

export const buildStateOf = (build: Build | null, typicalMinutes: number | null): BuildState => {
    if(build?.status === 'ready') return { ready: true, hash: build.hash, minutes: 0 };

    return { ready: false, hash: null, minutes: typicalMinutes ?? FALLBACK_MINUTES };
};

export const lammpsFoot = (state: BuildState, machineName: string): string => {
    if(state.ready) return 'Studio reuses this build for every simulation with the same packages.';

    return `Studio builds LAMMPS on ${machineName} once and reuses it after that.`;
};
