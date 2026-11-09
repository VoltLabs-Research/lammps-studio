import { Fragment } from 'react';
import StatusbarItem from '@/modules/run-control/components/StatusbarItem';
import { useDraftConfig, useDraftMachine, useLatestRun, useOpenSimulation, useRunPhase } from '@/modules/run-control/hooks/use-workspace';
import { statusbarOf } from '@/modules/run-control/utils/statusbar-items';
import { buildFor } from '@/modules/run-settings/utils/build-match';
import { useBuildsStore } from '@/shared/store/builds';
import { classNames } from '@/shared/utils/class-names';
import '@/modules/run-control/components/Statusbar/statusbar.css';

const Statusbar = () => {
    const simulation = useOpenSimulation();
    const phase = useRunPhase();
    const run = useLatestRun();
    const machine = useDraftMachine();
    const config = useDraftConfig();
    const builds = useBuildsStore((state) => state.items);

    const build = config ? buildFor(builds, config) : null;
    const bar = statusbarOf({ phase, run, machine, config, build, entry: simulation?.entry ?? null });

    return (
        <footer className='statusbar'>
            {bar.left.map((item, index) => (
                <Fragment key={item.key}>
                    {index > 0 ? <span className={classNames('statusbar__sep', bar.left[index - 1].wideOnly && 'hide-md')} /> : null}
                    <StatusbarItem item={item} />
                </Fragment>
            ))}
            <div className='statusbar__right'>
                {bar.status.map((item) => <StatusbarItem key={item.key} item={item} />)}
                <span className='statusbar__sep' />
                <StatusbarItem item={bar.entry} />
            </div>
        </footer>
    );
};

export default Statusbar;
