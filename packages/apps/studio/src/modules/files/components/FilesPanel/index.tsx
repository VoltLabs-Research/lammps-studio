import { CircleAlert } from 'lucide-react';
import FileCrumbs from '@/modules/files/components/FileCrumbs';
import FinderList from '@/modules/files/components/FinderList';
import type { FileContext } from '@/modules/files/domain/files';
import { useFolderSync } from '@/modules/files/hooks/use-folder-sync';
import { openFolder, selectEntry, useFolderStore } from '@/modules/files/store/folder';
import { fileErrorCopy } from '@/modules/files/utils/error-messages';
import { openEntry } from '@/modules/files/utils/file-actions';
import { crumbsOf, finderFoot, parentOf } from '@/modules/files/utils/finder';
import { folderOf } from '@/modules/simulations/utils/simulation-actions';
import PanelEmpty from '@/shared/components/PanelEmpty';
import PanelHead from '@/shared/components/PanelHead';
import { useMachinesStore } from '@/shared/store/machines';
import { useRunSessionStore } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';

const FilesPanel = () => {
    const simulationId = useRunSessionStore((state) => state.simulationId);
    const runs = useRunSessionStore((state) => state.runs);
    const simulation = useSimulationsStore((state) => state.items.find((item) => item.id === simulationId));
    const machine = useMachinesStore((state) => state.items.find((item) => item.id === simulation?.machineId));
    const { path, entries, status, error, selected } = useFolderStore();
    useFolderSync(simulationId);

    if(simulationId === null || !simulation){
        return (
            <>
                <PanelHead title='Files' />
                <div className='panel__body' />
            </>
        );
    }

    const crumbs = crumbsOf(simulation.folder, path);
    const context: FileContext = { simulationId, folder: folderOf(simulation, machine), runs };

    const openParent = () => {
        if(path !== '') void openFolder(simulationId, parentOf(path));
    };

    return (
        <>
            <PanelHead title='Files' sub={<FileCrumbs crumbs={crumbs} onOpen={(next) => void openFolder(simulationId, next)} />} />
            <div className='panel__body'>
                {status === 'failed'
                    ? (
                        <PanelEmpty icon={CircleAlert} title='The folder didn’t load'>
                            <p>{fileErrorCopy(error)}</p>
                        </PanelEmpty>
                    )
                    : (
                        <FinderList
                            label={crumbs[crumbs.length - 1].label}
                            entries={entries}
                            loaded={status === 'ready'}
                            selected={selected}
                            context={context}
                            foot={finderFoot(entries.length, machine)}
                            onSelect={selectEntry}
                            onOpen={(entry) => openEntry(entry, context)}
                            onParent={openParent}
                        />
                    )}
            </div>
        </>
    );
};

export default FilesPanel;
