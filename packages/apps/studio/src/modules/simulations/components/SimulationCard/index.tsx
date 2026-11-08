import { Simulation } from '@lammps-studio/contracts/simulation/domain';
import { Atom, FileCode, LoaderCircle, LucideIcon } from 'lucide-react';
import CardMenu from '@/modules/simulations/components/CardMenu';
import { usePreview } from '@/modules/simulations/hooks/use-preview';
import { captionOf, progressOf } from '@/modules/simulations/utils/card-caption';
import { isActive, phaseOf, SimulationPhase } from '@/modules/simulations/utils/simulation-phase';
import Icon from '@/shared/components/Icon';
import { useNow } from '@/shared/hooks/use-now';
import { useBuildsStore } from '@/shared/store/builds';
import { useMachinesStore } from '@/shared/store/machines';
import { useNavigationStore } from '@/shared/store/navigation';
import { classNames } from '@/shared/utils/class-names';
import '@/modules/simulations/components/SimulationCard/simulation-card.css';

interface SimulationCardProps{
    simulation: Simulation;
}

const PERCENT = 100;

const emptyGlyph = (phase: SimulationPhase): LucideIcon => {
    if(phase === 'building') return LoaderCircle;
    if(phase === 'draft') return FileCode;

    return Atom;
};

const SimulationCard = ({ simulation }: SimulationCardProps) => {
    const machine = useMachinesStore((state) => state.items.find((item) => item.id === simulation.machineId));
    const buildProgress = useBuildsStore((state) => state.items.find((build) => build.machineId === simulation.machineId && build.status === 'building')?.progress ?? null);
    const openWorkspace = useNavigationStore((state) => state.openWorkspace);
    const preview = usePreview(simulation);
    const now = useNow();

    const phase = phaseOf(simulation);
    const caption = captionOf(simulation, { machineName: machine?.name ?? simulation.machineId, buildProgress, now });
    const progress = progressOf(simulation, buildProgress);

    return (
        <article className={classNames('card', !isActive(phase) && 'is-idle')}>
            <button type='button' className='card__frame' aria-label={`Open ${simulation.name}`} onClick={() => openWorkspace(simulation.id)}>
                {preview
                    ? <img src={preview} alt='' />
                    : <span className='card__empty'><Icon glyph={emptyGlyph(phase)} size='lg' spin={phase === 'building'} /></span>}
                <span className='card__foot'>
                    <span className='card__title'>{simulation.name}</span>
                    <span className='card__caption'>
                        <span className={classNames('card__state', caption.danger && 'danger-ink')}>{caption.word}</span>
                        {caption.detail ? ` · ${caption.detail}` : null}
                    </span>
                    {progress === null ? null : <span className='card__progress'><i style={{ width: `${(progress * PERCENT).toFixed(1)}%` }} /></span>}
                </span>
            </button>
            <CardMenu simulation={simulation} machine={machine} />
        </article>
    );
};

export default SimulationCard;
