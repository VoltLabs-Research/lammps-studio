import { MACHINE_ICON, MACHINE_KIND_LABEL } from '@/modules/machines/utils/machine-labels';
import OptionCard from '@/modules/simulations/components/OptionCard';
import { useMachines } from '@/shared/hooks/use-machines';

interface MachineOptionsProps{
    machineId: string | null;
    onSelect: (machineId: string) => void;
}

const MachineOptions = ({ machineId, onSelect }: MachineOptionsProps) => {
    const machines = useMachines();

    return (
        <div>
            <span className='label'>Machine</span>
            <div className='mach-opts' role='radiogroup' aria-label='Machine'>
                {machines.map((machine) => (
                    <OptionCard
                        key={machine.id}
                        icon={MACHINE_ICON[machine.kind]}
                        title={machine.name}
                        sub={machine.status === 'offline' ? 'Offline' : MACHINE_KIND_LABEL[machine.kind]}
                        checked={machineId === machine.id}
                        disabled={machine.status === 'offline'}
                        onSelect={() => onSelect(machine.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default MachineOptions;
