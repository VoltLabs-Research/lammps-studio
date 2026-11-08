import { Machine } from '@lammps-studio/contracts/machine/domain';

export interface MachineFact{
    label: string;
    value: string;
    mono: boolean;
}

export interface MachineAction{
    label: string;
    danger: boolean;
}

const NO_SCHEDULER = 'None, runs directly';

const fact = (label: string, value: string, mono = false): MachineFact => ({ label, value, mono });

export const machineFactsOf = (machine: Machine): MachineFact[] => [
    fact('Host', machine.host, true),
    fact('Hardware', `${machine.cpu} · ${machine.cores} cores`),
    fact('Memory', machine.memory),
    ...(machine.gpus > 0 ? [fact('GPUs', String(machine.gpus))] : []),
    fact('Runtime', machine.runtime),
    fact('Scheduler', machine.scheduler ?? NO_SCHEDULER),
    fact('Agent', `lammps-agent ${machine.agentVersion}`, true),
    fact('Simulations folder', machine.root, true)
];

export const machineActionsOf = (machine: Machine): MachineAction[] => {
    if(machine.status === 'offline'){
        return [
            { label: 'Reconnect', danger: false },
            { label: 'Show agent log', danger: false },
            { label: `Remove ${machine.name}`, danger: true }
        ];
    }

    const terminal = { label: 'Open terminal', danger: false };
    if(machine.kind === 'local') return [terminal];

    return [terminal, { label: `Disconnect ${machine.name}`, danger: true }];
};
