import { useState } from 'react';
import { buildApi } from '@/modules/settings/api/api';
import { buildErrorCopy } from '@/modules/settings/utils/error-messages';
import { machineEntries, packageEntries, toggledPackages } from '@/modules/settings/utils/build-entries';
import { LAMMPS_VERSION } from '@/modules/settings/utils/package-catalog';
import Button from '@/shared/components/Button';
import Group from '@/shared/components/Group';
import GroupRow from '@/shared/components/GroupRow';
import InlineError from '@/shared/components/InlineError';
import Modal from '@/shared/components/Modal';
import ModalHead from '@/shared/components/ModalHead';
import Popup from '@/shared/components/Popup';
import { useModal } from '@/shared/hooks/use-modal';
import { useBuildsStore } from '@/shared/store/builds';
import { useMachinesStore } from '@/shared/store/machines';
import '@/modules/settings/components/NewBuildSheet/new-build-sheet.css';

const PACKAGES_WIDTH = 300;

const NewBuildSheet = () => {
    const { close } = useModal();
    const machines = useMachinesStore((state) => state.items);
    const [pickedMachine, setMachineId] = useState<string | null>(null);
    const [packages, setPackages] = useState<string[]>([]);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const machine = machines.find((item) => item.id === pickedMachine) ?? machines.find((item) => item.status === 'online');

    const build = async () => {
        if(!machine) return;

        setPending(true);
        setError(null);
        try{
            useBuildsStore.getState().upsert(await buildApi.create({ machineId: machine.id, version: LAMMPS_VERSION, packages }));
            close();
        }catch(cause){
            setError(buildErrorCopy(cause));
            setPending(false);
        }
    };

    return (
        <Modal label='New build' className='new-build'>
            <ModalHead title='New build' />
            <Group foot={machine ? `Studio builds LAMMPS on ${machine.name} once and reuses it after that.` : null}>
                <GroupRow label='Machine'>
                    <Popup label='Machine' value={machine?.name ?? 'None'} entries={machineEntries(machines, machine?.id ?? null, setMachineId)} />
                </GroupRow>
                <GroupRow label='Packages'>
                    <Popup
                        label='Packages'
                        value={packages.length > 0 ? packages.join(', ') : 'Core only'}
                        entries={packageEntries(packages, (name) => setPackages((current) => toggledPackages(current, name)))}
                        width={PACKAGES_WIDTH}
                    />
                </GroupRow>
            </Group>
            <InlineError message={error} />
            <div className='modal__foot'>
                <Button variant='ghost' onClick={close}>Cancel</Button>
                <Button variant='primary' disabled={!machine || pending} onClick={build}>Build</Button>
            </div>
        </Modal>
    );
};

export default NewBuildSheet;
