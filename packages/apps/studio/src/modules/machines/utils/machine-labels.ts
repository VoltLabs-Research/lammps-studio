import { MachineKind } from '@lammps-studio/contracts/machine/domain';
import { Cpu, LucideIcon, Monitor, Server } from 'lucide-react';

export const MACHINE_KIND_LABEL: Record<MachineKind, string> = {
    local: 'Local',
    slurm: 'Slurm cluster',
    ssh: 'Workstation over SSH'
};

export const MACHINE_ICON: Record<MachineKind, LucideIcon> = {
    local: Monitor,
    slurm: Server,
    ssh: Cpu
};
