import { LoaderCircle, Play, Square, X } from 'lucide-react';
import { RunButtonModel, RunPhase } from '@/modules/run-control/domain/run-control';

const RUN_TIP = 'Ctrl+Enter';
const STOP_TIP = 'Ctrl+.';

const BUTTONS: Record<RunPhase, RunButtonModel> = {
    noscript: { label: 'Run', variant: 'primary', icon: Play, spin: false, action: null, tip: null, menu: null },
    idle: { label: 'Run', variant: 'primary', icon: Play, spin: false, action: 'run', tip: RUN_TIP, menu: 'run' },
    queued: { label: 'Cancel', variant: 'secondary', icon: X, spin: false, action: 'stop', tip: null, menu: null },
    building: { label: 'Cancel build', variant: 'secondary', icon: X, spin: false, action: 'stop', tip: null, menu: null },
    starting: { label: 'Starting', variant: 'primary', icon: LoaderCircle, spin: true, action: null, tip: null, menu: null },
    running: { label: 'Stop', variant: 'danger', icon: Square, spin: false, action: 'stop', tip: STOP_TIP, menu: 'active' },
    stopping: { label: 'Stopping', variant: 'danger', icon: LoaderCircle, spin: true, action: null, tip: null, menu: 'active' },
    cancelled: { label: 'Run again', variant: 'primary', icon: Play, spin: false, action: 'run', tip: RUN_TIP, menu: 'run' },
    completed: { label: 'Run again', variant: 'primary', icon: Play, spin: false, action: 'run', tip: RUN_TIP, menu: 'run' },
    failed: { label: 'Run again', variant: 'primary', icon: Play, spin: false, action: 'run', tip: RUN_TIP, menu: 'run' }
};

export const runButtonOf = (phase: RunPhase): RunButtonModel => BUTTONS[phase];
