import { useEffect, useRef, useState } from 'react';
import { AtomScene } from '@/modules/viewport/scene/AtomScene';
import { renderPreview } from '@/modules/viewport/scene/render-preview';
import { readSceneTheme } from '@/modules/viewport/utils/theme-tokens';
import { cuFrame } from '../../cu/cu-frame';

const PREVIEW_STEP = 184000;
const PREVIEW_WIDTH = 720;
const PREVIEW_HEIGHT = 512;
const SNAPSHOT_SIZE = 400;

const PreviewProbe = () => {
    const host = useRef<HTMLDivElement>(null);
    const [preview, setPreview] = useState('');
    const [snapshot, setSnapshot] = useState('');
    const [report, setReport] = useState('Running');

    useEffect(() => {
        const element = host.current;

        if(!element){
            return;
        }

        const frame = cuFrame(PREVIEW_STEP);
        const scene = new AtomScene(element, () => undefined);
        let cancelled = false;

        const run = async () => {
            const url = await renderPreview(frame, { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, theme: readSceneTheme() });

            scene.resize(SNAPSHOT_SIZE, SNAPSHOT_SIZE);
            scene.setFrame(frame);

            const blob = await scene.snapshot();

            if(cancelled){
                return;
            }

            setPreview(url);
            setSnapshot(URL.createObjectURL(blob));
            setReport(`preview ${url.slice(0, 22)}… ${url.length} chars\nsnapshot ${blob.type} ${blob.size} bytes`);
        };

        void run();

        return () => {
            cancelled = true;
            scene.dispose();
        };
    }, []);

    return (
        <div className='probe'>
            <pre id='PROBE'>{report}</pre>
            <div className='probe__card'>{preview && <img src={preview} alt='Dashboard preview' width={PREVIEW_WIDTH / 2} height={PREVIEW_HEIGHT / 2} />}</div>
            {snapshot && <img src={snapshot} alt='Viewport snapshot' width={SNAPSHOT_SIZE / 2} height={SNAPSHOT_SIZE / 2} />}
            <div ref={host} className='probe__stage' />
        </div>
    );
};

export default PreviewProbe;
