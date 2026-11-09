import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import EntryOption from '@/modules/run-control/components/EntryOption';
import { candidatesOf, loadEntryCandidates, useEntryStore } from '@/modules/run-control/store/entry';
import { chooseEntry } from '@/modules/run-control/utils/entry-actions';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useWorkspaceStore } from '@/shared/store/workspace';
import '@/shared/components/TextField/text-field.css';
import '@/modules/run-control/components/EntryPicker/entry-picker.css';

interface EntryPickerProps{
    simulation: Simulation;
}

const EntryPicker = ({ simulation }: EntryPickerProps) => {
    const group = useId();
    const pathId = useId();
    const candidates = useEntryStore(candidatesOf(simulation.id));
    const openPanel = useWorkspaceStore((state) => state.openPanel);
    const [picked, setPicked] = useState<string | null>(null);
    const [typed, setTyped] = useState('');

    useEffect(() => {
        void loadEntryCandidates(simulation.id);
    }, [simulation.id]);

    const suggested = candidates.find((candidate) => candidate.likely)?.path ?? candidates[0]?.path ?? null;
    const chosen = typed.trim() || (picked ?? suggested);

    const use = () => {
        if(chosen) void chooseEntry(simulation.id, chosen);
    };

    return (
        <div className='picker glass'>
            <div className='picker__head'>
                <div className='picker__icon'><Icon glyph={TriangleAlert} /></div>
                <h3>No script found. Which file should LAMMPS run?</h3>
            </div>
            <p>Studio looks for main.in first, then any other .in file. This folder has neither, so pick the input script or type its path.</p>
            <div className='file-list' role='radiogroup' aria-label={`Files in ${simulation.folder}`}>
                {candidates.map((candidate) => (
                    <EntryOption key={candidate.path} group={group} candidate={candidate} checked={(picked ?? suggested) === candidate.path} onPick={setPicked} />
                ))}
            </div>
            <div>
                <label className='label' htmlFor={pathId}>Or a path inside the folder</label>
                <input id={pathId} className='field mono' placeholder='inputs/run.lammps' autoComplete='off' spellCheck={false} value={typed} onChange={(event) => setTyped(event.target.value)} />
            </div>
            <div className='picker__actions'>
                <Button variant='ghost' onClick={() => openPanel('editor')}>Open in editor</Button>
                <Button variant='primary' disabled={!chosen} onClick={use}>Use as entry script</Button>
            </div>
        </div>
    );
};

export default EntryPicker;
