import { RunFrameFrame, RunLogFrame, RunThermoFrame } from '@lammps-studio/contracts/events/gateway';
import { FrameInfo, LogLine, Run, ThermoSection } from '@lammps-studio/contracts/run/domain';
import { runRoutes } from '@lammps-studio/contracts/run/routes';
import { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { simulationRoutes } from '@lammps-studio/contracts/simulation/routes';
import { create } from 'zustand';
import { call } from '@/shared/api/call';
import { LoadStatus } from '@/shared/store/list-store';

interface RunOutput{
    log: LogLine[];
    thermo: ThermoSection[];
    frames: FrameInfo[];
}

interface RunSessionState extends RunOutput{
    simulationId: string | null;
    runs: Run[];
    runNumber: number | null;
    status: LoadStatus;
    error: unknown;
    script: ScriptInfo | null;
    scriptError: unknown;
}

const NO_OUTPUT: RunOutput = { log: [], thermo: [], frames: [] };

const emptySession = (simulationId: string | null): RunSessionState => ({
    simulationId,
    runs: [],
    runNumber: null,
    status: 'loading',
    error: null,
    script: null,
    scriptError: null,
    ...NO_OUTPUT
});

export const useRunSessionStore = create<RunSessionState>(() => emptySession(null));

const { getState: read, setState: write } = useRunSessionStore;

const isViewing = (simulationId: string, runNumber: number): boolean => {
    const state = read();

    return state.simulationId === simulationId && state.runNumber === runNumber;
};

const latestNumber = (runs: Run[]): number | null => runs.at(-1)?.number ?? null;

const upsertRun = (runs: Run[], run: Run): Run[] => {
    const others = runs.filter((other) => other.number !== run.number);

    return [...others, run].sort((a, b) => a.number - b.number);
};

const appendAfter = <T>(base: T[], extra: T[], keyOf: (item: T) => number): T[] => {
    const last = base.length > 0 ? keyOf(base[base.length - 1]) : -Infinity;
    const fresh = extra.filter((item) => keyOf(item) > last);

    return fresh.length > 0 ? [...base, ...fresh] : base;
};

const stepOf = (row: number[]): number => row[0];

export const mergeLog = (base: LogLine[], extra: LogLine[]): LogLine[] => appendAfter(base, extra, (line) => line.index);

export const mergeFrames = (base: FrameInfo[], extra: FrameInfo[]): FrameInfo[] => appendAfter(base, extra, (frame) => frame.index);

export const mergeThermo = (base: ThermoSection[], extra: ThermoSection[]): ThermoSection[] => {
    let sections = base;
    for(const section of extra){
        const existing = sections.find((other) => other.section === section.section);
        if(!existing){
            sections = [...sections, section].sort((a, b) => a.section - b.section);
            continue;
        }

        const rows = appendAfter(existing.rows, section.rows, stepOf);
        if(rows !== existing.rows) sections = sections.map((other) => (other === existing ? { ...existing, rows } : other));
    }

    return sections;
};

const loadOutput = async (simulationId: string, runNumber: number) => {
    const path = { simulationId, runNumber };
    try{
        const [log, thermo, frames] = await Promise.all([
            call(runRoutes.log, { path }),
            call(runRoutes.thermo, { path }),
            call(runRoutes.frames, { path })
        ]);
        if(!isViewing(simulationId, runNumber)) return;

        write((state) => ({
            status: 'ready',
            log: mergeLog(log, state.log),
            thermo: mergeThermo(thermo, state.thermo),
            frames: mergeFrames(frames, state.frames)
        }));
    }catch(error){
        if(isViewing(simulationId, runNumber)) write({ status: 'failed', error });
    }
};

export const reloadScript = async (simulationId: string) => {
    try{
        const script = await call(simulationRoutes.script, { path: { simulationId } });
        if(read().simulationId === simulationId) write({ script, scriptError: null });
    }catch(scriptError){
        if(read().simulationId === simulationId) write({ script: null, scriptError });
    }
};

export const openSession = async (simulationId: string) => {
    if(read().simulationId !== simulationId) write(emptySession(simulationId));
    void reloadScript(simulationId);
    try{
        const fetched = await call(runRoutes.list, { path: { simulationId } });
        if(read().simulationId !== simulationId) return;

        const { runs: known, runNumber: viewing } = read();
        const runs = fetched.reduce(upsertRun, known);
        const keeps = viewing !== null && runs.some((run) => run.number === viewing);
        const runNumber = keeps ? viewing : latestNumber(runs);
        if(keeps) write({ runs });
        else write({ runs, runNumber, status: runNumber === null ? 'ready' : 'loading', error: null, ...NO_OUTPUT });
        if(runNumber !== null) await loadOutput(simulationId, runNumber);
    }catch(error){
        if(read().simulationId === simulationId) write({ status: 'failed', error });
    }
};

export const selectRun = async (runNumber: number) => {
    const { simulationId, runNumber: viewing } = read();
    if(simulationId === null || viewing === runNumber) return;

    write({ runNumber, status: 'loading', error: null, ...NO_OUTPUT });
    await loadOutput(simulationId, runNumber);
};

export const closeSession = () => write(emptySession(null));

export const applySessionRun = (run: Run) => {
    const state = read();
    if(run.simulationId !== state.simulationId) return;

    const runs = upsertRun(state.runs, run);
    const following = state.runNumber === latestNumber(state.runs);
    if(!following || run.number <= (state.runNumber ?? 0)){
        write({ runs });
        return;
    }

    write({ runs, runNumber: run.number, status: 'loading', error: null, ...NO_OUTPUT });
    void loadOutput(run.simulationId, run.number);
};

export const applySessionLog = ({ simulationId, runNumber, lines }: RunLogFrame) => {
    if(!isViewing(simulationId, runNumber)) return;

    write((state) => ({ log: mergeLog(state.log, lines) }));
};

export const applySessionThermo = ({ simulationId, runNumber, section, columns, rows }: RunThermoFrame) => {
    if(!isViewing(simulationId, runNumber)) return;

    write((state) => ({ thermo: mergeThermo(state.thermo, [{ section, columns, rows }]) }));
};

export const applySessionFrame = ({ simulationId, runNumber, frame }: RunFrameFrame) => {
    if(!isViewing(simulationId, runNumber)) return;

    write((state) => ({ frames: mergeFrames(state.frames, [frame]) }));
};

export const viewedRun = (state: RunSessionState): Run | null => state.runs.find((run) => run.number === state.runNumber) ?? null;

export const latestRun = (state: RunSessionState): Run | null => state.runs.at(-1) ?? null;
