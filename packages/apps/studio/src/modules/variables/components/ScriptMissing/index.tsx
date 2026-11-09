import { Braces, CircleAlert } from 'lucide-react';
import PanelEmpty from '@/shared/components/PanelEmpty';
import { hasCode } from '@/shared/errors/has-code';
import { sharedErrorCopy } from '@/shared/utils/error-copy';

interface ScriptMissingProps{
    error: unknown;
}

const ScriptMissing = ({ error }: ScriptMissingProps) => {
    if(hasCode(error, 'Simulation::NoEntryScript')){
        return (
            <PanelEmpty icon={Braces} title='No entry script'>
                <p>Pick the entry script and its variables, computes, fixes and dumps show up here.</p>
            </PanelEmpty>
        );
    }

    return (
        <PanelEmpty icon={CircleAlert} title='The script didn’t load'>
            <p>{sharedErrorCopy(error)}</p>
        </PanelEmpty>
    );
};

export default ScriptMissing;
