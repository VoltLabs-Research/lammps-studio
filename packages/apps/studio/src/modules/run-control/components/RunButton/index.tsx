import { ChevronDown } from 'lucide-react';
import { useDraftConfig, useLatestRun, useOpenSimulation, useRunPhase } from '@/modules/run-control/hooks/use-workspace';
import { startRun, stopRun } from '@/modules/run-control/utils/run-actions';
import { runButtonOf } from '@/modules/run-control/utils/run-button';
import { runMenuEntries } from '@/modules/run-control/utils/run-menu';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Menu from '@/shared/components/Menu';
import { useMachines } from '@/shared/hooks/use-machines';
import { useMenu } from '@/shared/hooks/use-menu';
import '@/modules/run-control/components/RunButton/run-button.css';

const MENU_WIDTH = 270;

const RunButton = () => {
    const phase = useRunPhase();
    const simulation = useOpenSimulation();
    const run = useLatestRun();
    const config = useDraftConfig();
    const machines = useMachines();
    const menu = useMenu();

    const button = runButtonOf(phase);
    const ready = button.action === 'stop' || (button.action === 'run' && config !== null);
    const act = button.action === 'stop' ? stopRun : startRun;
    const entries = button.menu === null ? [] : runMenuEntries({
        kind: button.menu,
        stopping: run?.state === 'stopping',
        entry: config?.entry ?? simulation?.entry ?? '',
        machines,
        machineId: config?.machineId ?? null
    });

    return (
        <div className='btn-split'>
            <Button variant={button.variant} disabled={!ready} data-tip={button.tip ?? undefined} onClick={() => void act()}>
                <Icon glyph={button.icon} size='sm' spin={button.spin} />
                {button.label}
            </Button>
            {button.menu === null
                ? null
                : (
                    <Button
                        variant={button.variant}
                        aria-label='More run options'
                        aria-haspopup='menu'
                        aria-expanded={menu.anchor !== null}
                        onClick={(event) => menu.toggle(event.currentTarget)}
                    >
                        <Icon glyph={ChevronDown} size='sm' />
                    </Button>
                )}
            <Menu menu={menu} entries={entries} width={MENU_WIDTH} />
        </div>
    );
};

export default RunButton;
