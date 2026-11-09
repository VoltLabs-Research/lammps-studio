import { useState } from 'react';
import { useViewedRun } from '@/modules/run-control/hooks/use-workspace';
import { useWorkspaceStore } from '@/shared/store/workspace';

interface SeenWarnings{
    run: string | null;
    count: number;
}

export const useUnseenWarnings = (): number => {
    const run = useViewedRun();
    const reading = useWorkspaceStore((state) => state.panelOpen && state.panel === 'output');
    const [seen, setSeen] = useState<SeenWarnings>({ run: null, count: 0 });

    const key = run ? `${run.simulationId}/${run.number}` : null;
    const warnings = run?.warnings ?? 0;
    if(reading && (seen.run !== key || seen.count !== warnings)) setSeen({ run: key, count: warnings });

    const seenCount = seen.run === key ? seen.count : 0;

    return reading || warnings <= seenCount ? 0 : warnings;
};
