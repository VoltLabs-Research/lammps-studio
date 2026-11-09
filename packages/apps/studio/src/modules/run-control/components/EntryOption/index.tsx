import { EntryCandidate } from '@lammps-studio/contracts/script/domain';
import Chip from '@/shared/components/Chip';

interface EntryOptionProps{
    group: string;
    candidate: EntryCandidate;
    checked: boolean;
    onPick: (path: string) => void;
}

const EntryOption = ({ group, candidate, checked, onPick }: EntryOptionProps) => (
    <label className='file-opt'>
        <input type='radio' className='radio' name={group} value={candidate.path} checked={checked} onChange={() => onPick(candidate.path)} />
        <span className='mono'>{candidate.path}</span>
        {candidate.likely ? <Chip tone='ok'>Most likely</Chip> : null}
        <small>{candidate.hint}</small>
    </label>
);

export default EntryOption;
