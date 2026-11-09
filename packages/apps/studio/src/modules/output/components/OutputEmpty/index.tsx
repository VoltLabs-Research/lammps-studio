import { CircleAlert, LoaderCircle, SquareTerminal } from 'lucide-react';
import { RunState } from '@lammps-studio/contracts/run/domain';
import PanelEmpty from '@/shared/components/PanelEmpty';
import { LoadStatus } from '@/shared/store/list-store';
import { sharedErrorCopy } from '@/shared/utils/error-copy';

interface OutputEmptyProps{
    status: LoadStatus;
    error: unknown;
    runState: RunState | null;
}

const OutputEmpty = ({ status, error, runState }: OutputEmptyProps) => {
    if(status === 'loading') return <div className='panel__body' />;

    if(status === 'failed'){
        return (
            <div className='panel__body'>
                <PanelEmpty icon={CircleAlert} title='The log didn’t load'>
                    <p>{sharedErrorCopy(error)}</p>
                </PanelEmpty>
            </div>
        );
    }

    if(runState === 'building'){
        return (
            <div className='panel__body'>
                <PanelEmpty icon={LoaderCircle} spin title='LAMMPS is being built'>
                    <p>The run log starts here as soon as the build finishes. Build output is on the viewport card.</p>
                </PanelEmpty>
            </div>
        );
    }

    return (
        <div className='panel__body'>
            <PanelEmpty icon={SquareTerminal} title='Nothing has run yet'>
                <p>Press Run and LAMMPS writes its log here line by line, with warnings and errors highlighted.</p>
            </PanelEmpty>
        </div>
    );
};

export default OutputEmpty;
