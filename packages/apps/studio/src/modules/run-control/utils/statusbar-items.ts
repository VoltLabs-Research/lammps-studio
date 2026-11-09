import { Build } from '@lammps-studio/contracts/build/domain';
import { Machine } from '@lammps-studio/contracts/machine/domain';
import { Run, RunConfig } from '@lammps-studio/contracts/run/domain';
import { LAMMPS_VERSIONS } from '@lammps-studio/lammps/catalog/versions';
import { FileCode, LoaderCircle } from 'lucide-react';
import { MACHINE_ICON } from '@/modules/machines/utils/machine-labels';
import { RunPhase, Statusbar, StatusItem } from '@/modules/run-control/domain/run-control';
import { runResources } from '@/modules/runs/utils/run-rows';
import { formatInt } from '@/shared/utils/format';

export interface StatusbarContext{
    phase: RunPhase;
    run: Run | null;
    machine: Machine | null;
    config: RunConfig | null;
    build: Build | null;
    entry: string | null;
}

const LABEL_PARTS = ' · ';
const STABLE = 'stable';

const item = (key: string, text: string, patch: Partial<StatusItem> = {}): StatusItem => ({
    key,
    text,
    icon: null,
    mono: false,
    spin: false,
    wideOnly: false,
    ...patch
});

export const versionText = (version: string): string => {
    const label = LAMMPS_VERSIONS.find((option) => option.ref === version)?.label ?? version;
    const [channel, date] = label.split(LABEL_PARTS);

    return `LAMMPS ${channel === STABLE && date ? date : label}`;
};

const imageText = (build: Build | null): string => (build?.status === 'ready' ? build.image : 'build pending');

const leftItems = ({ machine, config, build }: StatusbarContext): StatusItem[] => {
    const items = machine ? [item('machine', machine.name, { icon: MACHINE_ICON[machine.kind] })] : [];
    if(!config) return items;

    return [
        ...items,
        item('image', imageText(build), { mono: true, wideOnly: true }),
        item('version', versionText(config.version)),
        item('parallel', runResources(config))
    ];
};

const statusItems = ({ phase, run, machine }: StatusbarContext): StatusItem[] => {
    if(phase === 'building') return [item('compiling', `Compiling on ${machine?.name ?? 'the machine'}`, { icon: LoaderCircle, spin: true })];
    if(phase === 'noscript') return [item('state', 'No entry script')];
    if(phase !== 'running') return [item('state', 'Ready')];

    const speed = run?.progress.stepsPerSecond ?? null;

    return speed ? [item('speed', `${formatInt(speed)} steps/s`)] : [];
};

export const statusbarOf = (context: StatusbarContext): Statusbar => ({
    left: leftItems(context),
    status: statusItems(context),
    entry: item('entry', context.entry ?? 'no entry script', { icon: FileCode })
});
