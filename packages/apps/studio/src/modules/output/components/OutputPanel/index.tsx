import { ArrowDownToLine, Copy, Download } from 'lucide-react';
import { useMemo } from 'react';
import OutputEmpty from '@/modules/output/components/OutputEmpty';
import LogView from '@/modules/output/components/LogView';
import { LogFilter } from '@/modules/output/domain/log';
import { useFreshLines } from '@/modules/output/hooks/use-fresh-lines';
import { useOutputViewStore } from '@/modules/output/store/output-view';
import { filterLog } from '@/modules/output/utils/filter-log';
import { copyLog, nextLineIndex, saveLog } from '@/modules/output/utils/log-actions';
import { outputSub, summarizeLog } from '@/modules/output/utils/log-summary';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import PanelHead from '@/shared/components/PanelHead';
import Seg from '@/shared/components/Seg';
import { SegOption } from '@/shared/contracts/ui';
import { useRunSessionStore, viewedRun } from '@/shared/store/run-session';

const FILTERS: SegOption<LogFilter>[] = [
    { value: 'all', label: 'All' },
    { value: 'thermo', label: 'Thermo' },
    { value: 'warnings', label: 'Warnings' }
];

const OutputPanel = () => {
    const log = useRunSessionStore((state) => state.log);
    const status = useRunSessionStore((state) => state.status);
    const error = useRunSessionStore((state) => state.error);
    const runNumber = useRunSessionStore((state) => state.runNumber);
    const run = useRunSessionStore(viewedRun);
    const { filter, follow, setFilter, setFollow } = useOutputViewStore();
    const summary = useMemo(() => summarizeLog(log), [log]);
    const lines = useMemo(() => filterLog(log, filter), [log, filter]);
    const freshFrom = useFreshLines(nextLineIndex(log), status === 'ready');
    const empty = log.length === 0;

    return (
        <>
            <PanelHead title='Output' sub={outputSub(summary, runNumber, run?.state === 'failed')}>
                <Seg size='sm' label='Lines to show' options={FILTERS} value={filter} onChange={setFilter} />
                <IconButton size='sm' label='Follow new lines' tip='Follow new lines' pressed={follow} onClick={() => setFollow(!follow)}>
                    <Icon glyph={ArrowDownToLine} size='sm' />
                </IconButton>
                <IconButton size='sm' label='Copy log' tip='Copy log' disabled={empty} onClick={() => copyLog(log)}>
                    <Icon glyph={Copy} size='sm' />
                </IconButton>
                <IconButton size='sm' label='Save log' tip='Save log as…' disabled={empty} onClick={() => saveLog(log)}>
                    <Icon glyph={Download} size='sm' />
                </IconButton>
            </PanelHead>
            {empty
                ? <OutputEmpty status={status} error={error} runState={run?.state ?? null} />
                : (
                    <LogView
                        lines={lines}
                        widest={summary.widest}
                        resetKey={`${runNumber}:${filter}`}
                        startAtTop={filter === 'warnings'}
                        follow={follow}
                        freshFrom={freshFrom}
                        onUnfollow={() => setFollow(false)}
                    />
                )}
        </>
    );
};

export default OutputPanel;
