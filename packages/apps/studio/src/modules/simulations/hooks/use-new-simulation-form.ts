import { SimulationTemplate } from '@lammps-studio/contracts/simulation/domain';
import { simulationApi } from '@/modules/simulations/api/api';
import { simulationErrorCopy } from '@/modules/simulations/utils/error-messages';
import { ExampleName } from '@/modules/simulations/utils/templates';
import { useMachines } from '@/shared/hooks/use-machines';
import { useModal } from '@/shared/hooks/use-modal';
import { useNavigationStore } from '@/shared/store/navigation';
import { useSimulationsStore } from '@/shared/store/simulations';
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
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const machineId = pickedMachine ?? machines.find((machine) => machine.status === 'online')?.id ?? null;
    const source = sourceOf(template, example, folder, repository);

    const create = async () => {
        if(machineId === null || source === '') return;

        setPending(true);
        setError(null);
        try{
            const simulation = await simulationApi.create({ name: name.trim() || UNTITLED, machineId, template, source });
            useSimulationsStore.getState().upsert(simulation);
            close();
            openWorkspace(simulation.id);
        }catch(cause){
            setError(simulationErrorCopy(cause));
            setPending(false);
        }
    };

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
