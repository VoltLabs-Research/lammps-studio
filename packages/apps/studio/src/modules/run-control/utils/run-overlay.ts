import { OverlayKind, RunPhase } from '@/modules/run-control/domain/run-control';

const PHASE_OVERLAY: Partial<Record<RunPhase, OverlayKind>> = {
    noscript: 'picker',
    idle: 'idle',
    building: 'building',
    starting: 'starting'
};

export const overlayOf = (phase: RunPhase, picking: boolean): OverlayKind | null => {
    if(picking) return 'picker';

    return PHASE_OVERLAY[phase] ?? null;
};
