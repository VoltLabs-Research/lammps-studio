import { SimulationTemplate } from '@lammps-studio/contracts/simulation/domain';
import { simulationErrorCopy } from '@/modules/simulations/utils/error-messages';
import { createSimulation } from '@/modules/simulations/utils/simulation-actions';
import { ExampleName } from '@/modules/simulations/utils/templates';
import { useMachines } from '@/shared/hooks/use-machines';
import { useModal } from '@/shared/hooks/use-modal';
import { useSubmission } from '@/shared/hooks/use-submission';
import { useNavigationStore } from '@/shared/store/navigation';
import { useState } from 'react';

export interface NewSimulationForm{
    name: string;
    machineId: string | null;
    template: SimulationTemplate;
    example: ExampleName;
    folder: string;
    repository: string;
    pending: boolean;
    error: string | null;
    canCreate: boolean;
    setName: (name: string) => void;
    setMachineId: (machineId: string) => void;
    setTemplate: (template: SimulationTemplate) => void;
    setExample: (example: ExampleName) => void;
    setFolder: (folder: string) => void;
    setRepository: (repository: string) => void;
    create: () => Promise<void>;
}

const UNTITLED = 'Untitled simulation';

const sourceOf = (template: SimulationTemplate, example: ExampleName, folder: string, repository: string): string | null => {
    if(template === 'example') return example;
    if(template === 'folder') return folder.trim();
    if(template === 'git') return repository.trim();

    return null;
};

export const useNewSimulationForm = (): NewSimulationForm => {
    const { close } = useModal();
    const machines = useMachines();
    const openWorkspace = useNavigationStore((state) => state.openWorkspace);
    const [name, setName] = useState('');
    const [pickedMachine, setMachineId] = useState<string | null>(null);
    const [template, setTemplate] = useState<SimulationTemplate>('empty');
    const [example, setExample] = useState<ExampleName>('melt');
    const [folder, setFolder] = useState('');
    const [repository, setRepository] = useState('');
    const { pending, error, submit } = useSubmission(simulationErrorCopy);

    const machineId = pickedMachine ?? machines.find((machine) => machine.status === 'online')?.id ?? null;
    const source = sourceOf(template, example, folder, repository);

    const create = () => submit(async () => {
        if(machineId === null || source === '') return;

        const simulation = await createSimulation({ name: name.trim() || UNTITLED, machineId, template, source });
        close();
        openWorkspace(simulation.id);
    });

    return {
        name,
        machineId,
        template,
        example,
        folder,
        repository,
        pending,
        error,
        canCreate: machineId !== null && source !== '' && !pending,
        setName,
        setMachineId,
        setTemplate,
        setExample,
        setFolder,
        setRepository,
        create
    };
};
