import { Run, RunState } from '@lammps-studio/contracts/run/domain';
import { runApi } from '@/modules/run-control/api/api';
import { runErrorCopy } from '@/modules/run-control/utils/error-messages';
import { isActiveState, runPhaseOf } from '@/modules/run-control/utils/run-phase';
import { useRunDraftStore } from '@/shared/store/run-draft';
import { applySessionRun, latestRun, reloadScript, selectRun, useRunSessionStore } from '@/shared/store/run-session';
import { applyRun, useSimulationsStore } from '@/shared/store/simulations';
import { toast } from '@/shared/store/toast';

const CANCELLED: Partial<Record<RunState, string>> = {
    queued: 'Job cancelled',
    building: 'Build cancelled',
    starting: 'Start cancelled'
};

const adopt = (run: Run) => {
    applyRun(run);
    applySessionRun(run);
};

const openSimulation = () => {
    const { simulationId } = useRunSessionStore.getState();

    return useSimulationsStore.getState().items.find((item) => item.id === simulationId) ?? null;
};

export const startRun = async () => {
    const session = useRunSessionStore.getState();
    const draft = useRunDraftStore.getState();
    const simulation = openSimulation();
    if(!simulation || !draft.config || draft.simulationId !== simulation.id) return;

    const phase = runPhaseOf(simulation, latestRun(session));
    if(phase === 'noscript'){
        toast('Choose the entry script first');
        return;
    }
    if(phase !== 'idle' && isActiveState(phase)) return;

    try{
        const run = await runApi.start(simulation.id, draft.config);
        adopt(run);
        if(useRunSessionStore.getState().runNumber !== run.number) await selectRun(run.number);
    }catch(error){
        toast(runErrorCopy(error));
    }
};

const stop = async (kill: boolean) => {
    const session = useRunSessionStore.getState();
    const run = latestRun(session);
    if(session.simulationId === null || !run || !isActiveState(run.state)) return;
    if(!kill && run.state === 'stopping') return;
    if(kill && run.state !== 'running' && run.state !== 'stopping') return;

    try{
        adopt(await runApi.stop(session.simulationId, run.number, kill));
        const cancelled = CANCELLED[run.state];
        if(cancelled) toast(cancelled);
    }catch(error){
        toast(runErrorCopy(error));
    }
};

export const stopRun = () => stop(false);

export const killRun = () => stop(true);

const unique = (names: string[]): string[] => [...new Set(names)];

export const checkInput = async () => {
    const { simulationId } = useRunSessionStore.getState();
    if(simulationId === null) return;

    await reloadScript(simulationId);
    const { script, scriptError } = useRunSessionStore.getState();
    if(!script){
        toast(runErrorCopy(scriptError));
        return;
    }

    const packages = useRunDraftStore.getState().config?.packages ?? [];
    const missing = unique(script.requiredPackages.map((pkg) => pkg.name)).filter((name) => !packages.includes(name));
    const checked = `${script.lines} lines checked`;
    if(missing.length > 0){
        toast(`${script.entry} needs ${missing.join(', ')} · ${checked}`);
        return;
    }

    toast(`${script.entry}: no problems found · ${checked}`);
};
