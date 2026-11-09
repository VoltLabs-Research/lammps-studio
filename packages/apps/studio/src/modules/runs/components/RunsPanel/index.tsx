import { CircleAlert, History } from 'lucide-react';
import { openFolder } from '@/modules/files/store/folder';
import RunsList from '@/modules/runs/components/RunsList';
import type { RunRowModel } from '@/modules/runs/domain/runs';
import { runGroups, runsSub } from '@/modules/runs/utils/run-rows';
import PanelEmpty from '@/shared/components/PanelEmpty';
import PanelHead from '@/shared/components/PanelHead';
import { useNow } from '@/shared/hooks/use-now';
import { useBuildsStore } from '@/shared/store/builds';
import { selectRun, useRunSessionStore } from '@/shared/store/run-session';
import { useSimulationsStore } from '@/shared/store/simulations';
import { useWorkspaceStore } from '@/shared/store/workspace';
import { sharedErrorCopy } from '@/shared/utils/error-copy';

const RunsPanel = () => {
    const simulationId = useRunSessionStore((state) => state.simulationId);
    const runs = useRunSessionStore((state) => state.runs);
    const status = useRunSessionStore((state) => state.status);
    const error = useRunSessionStore((state) => state.error);
    const folder = useSimulationsStore((state) => state.items.find((item) => item.id === simulationId)?.folder);
    const builds = useBuildsStore((state) => state.items);
    const openPanel = useWorkspaceStore((state) => state.openPanel);
    const now = useNow();
    const buildProgress = (hash: string) => builds.find((build) => build.hash === hash && build.status === 'building')?.progress ?? null;

    const open = (row: RunRowModel) => {
        if(simulationId === null) return;

        void selectRun(row.number);
        void openFolder(simulationId, row.folder);
        openPanel('files');
    };

    return (
        <>
            <PanelHead title='Runs' sub={runs.length > 0 ? runsSub(runs.length) : folder} />
            <div className='panel__body'>
                {runs.length > 0 && <RunsList groups={runGroups(runs, { now, buildProgress })} onOpen={open} />}
                {runs.length === 0 && status === 'ready' && (
                    <PanelEmpty icon={History} title='No runs yet'>
                        <p>Every run shows up here with its settings and its own output folder.</p>
                    </PanelEmpty>
                )}
                {runs.length === 0 && status === 'failed' && (
                    <PanelEmpty icon={CircleAlert} title='The runs didn’t load'>
                        <p>{sharedErrorCopy(error)}</p>
                    </PanelEmpty>
                )}
            </div>
        </>
    );
};

export default RunsPanel;
