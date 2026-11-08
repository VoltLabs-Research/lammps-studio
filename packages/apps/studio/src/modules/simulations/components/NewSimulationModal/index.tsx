import { FormEvent } from 'react';
import MachineOptions from '@/modules/simulations/components/MachineOptions';
import TemplateOptions from '@/modules/simulations/components/TemplateOptions';
import TemplateSource from '@/modules/simulations/components/TemplateSource';
import { useNewSimulationForm } from '@/modules/simulations/hooks/use-new-simulation-form';
import Button from '@/shared/components/Button';
import InlineError from '@/shared/components/InlineError';
import Modal from '@/shared/components/Modal';
import ModalHead from '@/shared/components/ModalHead';
import TextField from '@/shared/components/TextField';
import { useModal } from '@/shared/hooks/use-modal';
import '@/modules/simulations/components/NewSimulationModal/new-simulation-modal.css';

const NewSimulationModal = () => {
    const { close } = useModal();
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
                <MachineOptions machineId={form.machineId} onSelect={form.setMachineId} />
                <TemplateOptions template={form.template} onSelect={form.setTemplate} />
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
