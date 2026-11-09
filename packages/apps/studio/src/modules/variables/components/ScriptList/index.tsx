import type { ScriptInfo } from '@lammps-studio/contracts/script/domain';
import { Braces, Film, Settings } from 'lucide-react';
import ScriptRow from '@/modules/variables/components/ScriptRow';
import type { VariablesTab } from '@/modules/variables/domain/variables';
import { computeNote, computeStyle, dumpOutput, dumpSummary, fixNote } from '@/modules/variables/utils/command-notes';
import { THERMO_COMPUTES, thermoComputeNote } from '@/modules/variables/utils/thermo-computes';
import Chip from '@/shared/components/Chip';
import { formatInt } from '@/shared/utils/format';

interface ScriptListProps{
    tab: Exclude<VariablesTab, 'variables'>;
    script: ScriptInfo;
    thermoColumns: string[];
    frames: number;
}

const framesLabel = (frames: number): string => `${formatInt(frames)} frame${frames === 1 ? '' : 's'}`;

const ScriptList = ({ tab, script, thermoColumns, frames }: ScriptListProps) => (
    <div className='list'>
        {tab === 'computes' && script.computes.map((compute) => (
            <ScriptRow
                key={compute.id}
                icon={Braces}
                id={compute.id}
                meta={`${compute.group} · ${computeStyle(compute)}`}
                detail={computeNote(compute, script, thermoColumns)}
            />
        ))}
        {tab === 'computes' && THERMO_COMPUTES.map((compute) => (
            <ScriptRow
                key={compute.id}
                icon={Braces}
                id={compute.id}
                meta={`${compute.group} · ${compute.style}`}
                detail={thermoComputeNote(compute, thermoColumns)}
            />
        ))}
        {tab === 'fixes' && script.fixes.map((fix) => (
            <ScriptRow
                key={fix.id}
                icon={Settings}
                id={fix.id}
                meta={fix.group}
                detail={computeStyle(fix)}
                mono
                aside={<span className='script-row__note'>{fixNote(fix, script)}</span>}
            />
        ))}
        {tab === 'dumps' && script.dumps.map((dump, index) => (
            <ScriptRow
                key={dump.id}
                icon={Film}
                id={dump.id}
                meta={dumpSummary(dump)}
                detail={dumpOutput(dump)}
                mono
                aside={index === 0 && frames > 0 ? <Chip><span className='num'>{framesLabel(frames)}</span></Chip> : null}
            />
        ))}
    </div>
);

export default ScriptList;
