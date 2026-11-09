import type { FrameInfo } from '@lammps-studio/contracts/run/domain';
import { ChevronLeft, ChevronRight, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { useEffect } from 'react';
import FrameRuler from '@/modules/viewport/components/FrameRuler';
import type { FrameSpan, RulerSpan } from '@/modules/viewport/domain/workspace';
import { moveFrames, playTick, togglePlay } from '@/modules/viewport/store/viewport-view';
import { pickAt, stepBack, stepForward, toFirst, toggleLive, toLast } from '@/modules/viewport/utils/frame-cursor';
import Icon from '@/shared/components/Icon';
import IconButton from '@/shared/components/IconButton';
import '@/modules/viewport/components/FrameTimeline/frame-timeline.css';

interface FrameTimelineProps{
    frames: FrameInfo[];
    position: number;
    span: FrameSpan;
    following: boolean;
    ruler: RulerSpan;
    marker: number | null;
    playing: boolean;
}

const PLAY_MS = 110;

const FrameTimeline = ({ frames, position, span, following, ruler, marker, playing }: FrameTimelineProps) => {
    useEffect(() => {
        if(!playing) return;

        const timer = setInterval(playTick, PLAY_MS);

        return () => clearInterval(timer);
    }, [playing]);

    const seek = (index: number) => {
        const target = frames.findIndex((frame) => frame.index === index);
        moveFrames((_, current) => pickAt(target, current));
    };
    const playLabel = playing ? 'Pause' : 'Play frames';

    return (
        <>
            <IconButton label='First frame' tip='First frame' tipSide='top' size='sm' onClick={() => moveFrames(toFirst)}>
                <Icon glyph={SkipBack} size='sm' />
            </IconButton>
            <IconButton label='Previous frame' tip='Previous frame' tipSide='top' size='sm' onClick={() => moveFrames(stepBack)}>
                <Icon glyph={ChevronLeft} size='sm' />
            </IconButton>
            <IconButton label={playLabel} tip={playLabel} tipSide='top' size='sm' onClick={togglePlay}>
                <Icon glyph={playing ? Square : Play} size='sm' />
            </IconButton>
            <IconButton label='Next frame' tip='Next frame' tipSide='top' size='sm' onClick={() => moveFrames(stepForward)}>
                <Icon glyph={ChevronRight} size='sm' />
            </IconButton>
            <IconButton label='Last frame' tip='Last frame' tipSide='top' size='sm' onClick={() => moveFrames((_, current) => toLast(current))}>
                <Icon glyph={SkipForward} size='sm' />
            </IconButton>
            <FrameRuler frames={frames} index={frames[position]?.index ?? 0} startStep={ruler.startStep} endStep={ruler.endStep} marker={marker} onSeek={seek} />
            <button type='button' className='live-btn' aria-pressed={following} disabled={!span.running} onClick={() => moveFrames(toggleLive)}>
                <span className='dot' />
                Live
            </button>
        </>
    );
};

export default FrameTimeline;
