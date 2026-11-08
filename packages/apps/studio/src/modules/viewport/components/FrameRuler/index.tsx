import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { FrameRulerProps, RulerModel } from '@/modules/viewport/domain/components';
import { drawRuler, RULER_PAD } from '@/modules/viewport/components/FrameRuler/draw-ruler';
import { nearestFrame } from '@/modules/viewport/utils/nearest-frame';
import { watchTheme } from '@/modules/viewport/utils/watch-theme';
import '@/modules/viewport/components/FrameRuler/frame-ruler.css';

const FrameRuler = ({ frames, index, startStep, endStep, marker, onSeek }: FrameRulerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const position = frames.findIndex((frame) => frame.index === index);

    useEffect(() => {
        const canvas = canvasRef.current;

        if(!canvas){
            return;
        }

        const model: RulerModel = {
            steps: frames.map((frame) => frame.step),
            index: position,
            startStep,
            endStep,
            marker
        };
        const draw = () => drawRuler(canvas, model);
        const observer = new ResizeObserver(draw);
        const stopWatching = watchTheme(draw);

        observer.observe(canvas);
        document.fonts.addEventListener('loadingdone', draw);
        draw();

        return () => {
            observer.disconnect();
            stopWatching();
            document.fonts.removeEventListener('loadingdone', draw);
        };
    }, [frames, position, startStep, endStep, marker]);

    const seek = (event: PointerEvent<HTMLDivElement>) => {
        if(!frames.length){
            return;
        }

        const box = event.currentTarget.getBoundingClientRect();
        const share = (event.clientX - box.left - RULER_PAD) / (box.width - RULER_PAD * 2);

        onSeek(frames[nearestFrame(frames, startStep + share * (endStep - startStep))].index);
    };

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        seek(event);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if(event.currentTarget.hasPointerCapture(event.pointerId)){
            seek(event);
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const moves: Record<string, number> = {
            ArrowLeft: position - 1,
            ArrowRight: position + 1,
            Home: 0,
            End: frames.length - 1
        };
        const target = moves[event.key];

        if(target === undefined || !frames.length){
            return;
        }

        event.preventDefault();
        onSeek(frames[Math.min(Math.max(target, 0), frames.length - 1)].index);
    };

    const current = frames[position];

    return (
        <div
            className='ruler'
            role='slider'
            tabIndex={0}
            aria-label='Frame'
            aria-valuemin={0}
            aria-valuemax={Math.max(0, frames.length - 1)}
            aria-valuenow={Math.max(0, position)}
            aria-valuetext={current ? `Step ${current.step.toLocaleString('en-US')}` : 'No frames yet'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onKeyDown={onKeyDown}
        >
            <canvas ref={canvasRef} />
        </div>
    );
};

export default FrameRuler;
