import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Matrix4 } from 'three';
import type { AtomViewportProps, StageStyle } from '@/modules/viewport/domain/components';
import AxesGizmo from '@/modules/viewport/components/AxesGizmo';
import { AtomScene } from '@/modules/viewport/scene/AtomScene';
import '@/modules/viewport/components/AtomViewport/atom-viewport.css';

const AtomViewport = ({ frame, colorMode, showBox, showAxes, atomScale, bottomInset, children, ref }: AtomViewportProps) => {
    const stageRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<AtomScene | null>(null);
    const [view, setView] = useState<Matrix4 | null>(null);

    useEffect(() => {
        const stage = stageRef.current;

        if(!stage){
            return;
        }

        const scene = new AtomScene(stage, setView);
        const observer = new ResizeObserver(() => scene.resize(stage.clientWidth, stage.clientHeight));

        sceneRef.current = scene;
        scene.resize(stage.clientWidth, stage.clientHeight);
        observer.observe(stage);

        return () => {
            observer.disconnect();
            scene.dispose();
            sceneRef.current = null;
        };
    }, []);

    useEffect(() => {
        if(frame){
            sceneRef.current?.setFrame(frame);
        }
    }, [frame]);

    useEffect(() => {
        sceneRef.current?.setColorMode(colorMode);
    }, [colorMode]);

    useEffect(() => {
        sceneRef.current?.setShowBox(showBox);
    }, [showBox]);

    useEffect(() => {
        sceneRef.current?.setAtomScale(atomScale);
    }, [atomScale]);

    useEffect(() => {
        sceneRef.current?.setBottomInset(bottomInset);
    }, [bottomInset]);

    useImperativeHandle(ref, () => ({
        resetView: () => sceneRef.current?.resetView(),
        snapshot: () => {
            const scene = sceneRef.current;

            if(!scene){
                return Promise.reject(new DOMException('The viewport is not mounted', 'InvalidStateError'));
            }

            return scene.snapshot();
        },
        atomRadius: () => sceneRef.current?.atomRadius ?? null
    }), []);

    const style: StageStyle = {
        '--bar-h': `${bottomInset}px`
    };

    return (
        <div ref={stageRef} className='vp-stage' style={style}>
            {showAxes && frame && view && <AxesGizmo view={view} />}
            {children}
        </div>
    );
};

export default AtomViewport;
