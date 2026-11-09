import { RotateCcw } from 'lucide-react';
import ScriptMissing from '@/modules/variables/components/ScriptMissing';
import VariablesBody from '@/modules/variables/components/VariablesBody';
import { variablesSub } from '@/modules/variables/utils/variable-rows';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import PanelHead from '@/shared/components/PanelHead';
import { useRunDraftStore } from '@/shared/store/run-draft';
import { useRunSessionStore } from '@/shared/store/run-session';
import { toast } from '@/shared/store/toast';

const VariablesPanel = () => {
    const script = useRunSessionStore((state) => state.script);
    const scriptError = useRunSessionStore((state) => state.scriptError);
    const runNumber = useRunSessionStore((state) => state.runNumber);
    const overrides = useRunDraftStore((state) => Object.keys(state.config?.variables ?? {}).length);
    const patchDraft = useRunDraftStore((state) => state.patchDraft);

    const reset = () => {
        patchDraft({ variables: {} });
        toast('Overrides cleared');
    };

    return (
        <>
            <PanelHead title='Variables' sub={script ? variablesSub(script.entry, runNumber) : null}>
                <Button size='sm' disabled={overrides === 0} onClick={reset}>
                    <Icon glyph={RotateCcw} size='xs' />
                    Reset
                </Button>
            </PanelHead>
            {script && <VariablesBody script={script} />}
            {!script && <div className='panel__body'>{scriptError ? <ScriptMissing error={scriptError} /> : null}</div>}
        </>
    );
};

export default VariablesPanel;
