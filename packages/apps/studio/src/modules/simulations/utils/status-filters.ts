import { isActive, SimulationPhase } from '@/modules/simulations/utils/simulation-phase';

export type StatusFilter = 'all' | 'running' | 'queued' | 'finished' | 'failed' | 'draft';

export interface StatusFilterOption{
    value: StatusFilter;
    label: string;
    matches: (phase: SimulationPhase) => boolean;
}

export const STATUS_FILTERS: readonly StatusFilterOption[] = [
    { value: 'all', label: 'All', matches: () => true },
    { value: 'running', label: 'Running', matches: isActive },
    { value: 'queued', label: 'Queued', matches: (phase) => phase === 'queued' },
    { value: 'finished', label: 'Finished', matches: (phase) => phase === 'finished' || phase === 'stopped' },
    { value: 'failed', label: 'Failed', matches: (phase) => phase === 'failed' },
    { value: 'draft', label: 'Drafts', matches: (phase) => phase === 'draft' }
];

export const matchesStatus = (filter: StatusFilter, phase: SimulationPhase): boolean =>
    STATUS_FILTERS.some((option) => option.value === filter && option.matches(phase));
