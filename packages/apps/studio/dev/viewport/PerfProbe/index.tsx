import { useEffect, useRef, useState } from 'react';
import { AtomScene } from '@/modules/viewport/scene/AtomScene';
import { bigFrame } from '@dev/big-frame';

const params = new URLSearchParams(location.search);
const CELLS = Number(params.get('cells') ?? 63);
const SAMPLES = 60;
const WHEEL_STEP = 4;
const PERCENTILE = 0.95;
const DIGITS = 1;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const gpuName = (): string => {
    const context = document.createElement('canvas').getContext('webgl2');
    const info = context?.getExtension('WEBGL_debug_renderer_info');

    return context && info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown';
};

const summary = (times: number[]): string => {
    const sorted = [...times].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const tail = sorted[Math.floor(sorted.length * PERCENTILE)];

    return `median ${median.toFixed(DIGITS)} ms, p95 ${tail.toFixed(DIGITS)} ms`;
};

const timed = (work: () => void): number => {
    const start = performance.now();

    work();

    return performance.now() - start;
};

const PerfProbe = () => {
    const host = useRef<HTMLDivElement>(null);
    const [report, setReport] = useState('Running');

    useEffect(() => {
        const element = host.current;

        if(!element){
            return;
        }

        const scene = new AtomScene(element, () => undefined);
        const canvas = element.querySelector('canvas');
        let cancelled = false;

        const run = async () => {
            const frames = [bigFrame(CELLS, 1), bigFrame(CELLS, 2)];
            const width = element.clientWidth;
            const height = element.clientHeight;

            scene.resize(width, height);

            const firstFrame = timed(() => scene.setFrame(frames[0]));
            const firstDraw = timed(() => scene.resize(width, height));
            const live: number[] = [];
            const orbit: number[] = [];

            for(let i = 0; i < SAMPLES && !cancelled; i++){
                live.push(timed(() => scene.setFrame(frames[i % 2])));
                await nextFrame();
            }

            let last = await nextFrame();

            for(let i = 0; i < SAMPLES && !cancelled && canvas; i++){
                canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: i % 2 ? WHEEL_STEP : -WHEEL_STEP, cancelable: true }));
                const now = await nextFrame();
                orbit.push(now - last);
                last = now;
            }
            if(cancelled){
                return;
            }

            setReport([
                `atoms ${frames[0].header.atoms.toLocaleString('en-US')}`,
                `gpu ${gpuName()}`,
                `radius ${scene.atomRadius.toFixed(3)}`,
                `first setFrame ${firstFrame.toFixed(DIGITS)} ms`,
                `first draw ${firstDraw.toFixed(DIGITS)} ms`,
                `live setFrame ${summary(live)}`,
                `zoom frame interval ${summary(orbit)}`
            ].join('\n'));
        };

        void run();

        return () => {
            cancelled = true;
            scene.dispose();
        };
    }, []);

    return (
        <div className='perf'>
            <div ref={host} className='vp-stage' />
            <pre id='PERF'>{report}</pre>
        </div>
    );
};

export default PerfProbe;
