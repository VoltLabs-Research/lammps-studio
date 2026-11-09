import type { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import ScriptList from '@/modules/variables/components/ScriptList';
import VariablesTabs from '@/modules/variables/components/VariablesTabs';
import VariableTable from '@/modules/variables/components/VariableTable';
import { useVariablesViewStore } from '@/modules/variables/store/variables-view';
import { isTabEmpty, thermoColumnsOf, variableRows } from '@/modules/variables/utils/variable-rows';
import { useRunDraftStore } from '@/shared/store/run-draft';
import { useRunSessionStore, viewedRun } from '@/shared/store/run-session';
import '@/modules/variables/components/VariablesBody/variables-body.css';

interface VariablesBodyProps{
    script: ScriptInfo;
}

const VariablesBody = ({ script }: VariablesBodyProps) => {
    const thermo = useRunSessionStore((state) => state.thermo);
    const frames = useRunSessionStore((state) => state.frames.length);
    const run = useRunSessionStore(viewedRun);
    const draft = useRunDraftStore((state) => state.config);
    const setVariable = useRunDraftStore((state) => state.setVariable);
    const { tab, setTab } = useVariablesViewStore();
    const empty = isTabEmpty(script, tab);

    return (
        <div className='panel__body'>
            <VariablesTabs tab={tab} onChange={setTab} />
            {empty && <p className='script-none'>{script.entry} has no {tab}</p>}
            {!empty && tab === 'variables' && (
                <VariableTable
                    rows={variableRows(script, run, thermo, draft?.variables ?? null)}
                    editable={draft !== null}
                    onOverride={setVariable}
                />
            )}
            {!empty && tab !== 'variables' && <ScriptList tab={tab} script={script} thermoColumns={thermoColumnsOf(thermo)} frames={frames} />}
        </div>
    );
};

export default VariablesBody;
