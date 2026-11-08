import { FormEvent } from 'react';
import { MACHINE_ICON, MACHINE_KIND_LABEL } from '@/modules/machines/utils/machine-labels';
import OptionCard from '@/modules/simulations/components/OptionCard';
import TemplateSource from '@/modules/simulations/components/TemplateSource';
import { useNewSimulationForm } from '@/modules/simulations/hooks/use-new-simulation-form';
import { TEMPLATES } from '@/modules/simulations/utils/templates';
import Button from '@/shared/components/Button';
import InlineError from '@/shared/components/InlineError';
import Modal from '@/shared/components/Modal';
import ModalHead from '@/shared/components/ModalHead';
import TextField from '@/shared/components/TextField';
import { useModal } from '@/shared/hooks/use-modal';
import { useMachinesStore } from '@/shared/store/machines';
import '@/modules/simulations/components/NewSimulationModal/new-simulation-modal.css';

const NewSimulationModal = () => {
    const { close } = useModal();
    const machines = useMachinesStore((state) => state.items);
    const form = useNewSimulationForm();

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void form.create();
    };

    return (
        <Modal label='New simulation'>
            <form className='new-simulation' onSubmit={submit}>
                <ModalHead title='New simulation'>
                    Studio creates a folder for it on the machine you pick and opens it in VS Code. Put your script in main.in.
                </ModalHead>
                <TextField label='Name' placeholder='Cu nanowire compression' value={form.name} onChange={form.setName} />
                <div>
                    <span className='label'>Machine</span>
                    <div className='mach-opts' role='radiogroup' aria-label='Machine'>
                        {machines.map((machine) => (
                            <OptionCard
                                key={machine.id}
                                icon={MACHINE_ICON[machine.kind]}
                                title={machine.name}
                                sub={machine.status === 'offline' ? 'Offline' : MACHINE_KIND_LABEL[machine.kind]}
                                checked={form.machineId === machine.id}
                                disabled={machine.status === 'offline'}
                                onSelect={() => form.setMachineId(machine.id)}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <span className='label'>Start from</span>
                    <div className='opt-cards' role='radiogroup' aria-label='Start from'>
                        {TEMPLATES.map((option) => (
                            <OptionCard
                                key={option.value}
                                icon={option.icon}
                                title={option.title}
                                sub={option.sub}
                                checked={form.template === option.value}
                                onSelect={() => form.setTemplate(option.value)}
                            />
                        ))}
                    </div>
                </div>
                <TemplateSource form={form} />
                <InlineError message={form.error} />
                <div className='modal__foot'>
                    <Button variant='ghost' onClick={close}>Cancel</Button>
                    <Button variant='primary' submit disabled={!form.canCreate}>Create and open</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NewSimulationModal;
