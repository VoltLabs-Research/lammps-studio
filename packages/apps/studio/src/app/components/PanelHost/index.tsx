import { KeyboardEvent, PointerEvent, useRef, useState } from 'react';
import { PANELS } from '@/app/config/panels';
import { PanelDrag, PanelStyle } from '@/app/contracts/panel-host';
import { useWorkspaceStore } from '@/shared/store/workspace';
import { classNames } from '@/shared/utils/class-names';
import '@/app/components/PanelHost/panel-host.css';

const MIN_WIDTH = 320;
const MAX_SHARE = 0.7;
const KEY_STEP = 24;
const KEY_MOVES: Record<string, number> = {
    ArrowLeft: -KEY_STEP,
    ArrowRight: KEY_STEP
};

const PanelHost = () => {
    const panel = useWorkspaceStore((state) => state.panel);
    const panelOpen = useWorkspaceStore((state) => state.panelOpen);
    const [width, setWidth] = useState<number | null>(null);
    const [drag, setDrag] = useState<PanelDrag | null>(null);
    const ref = useRef<HTMLElement>(null);
    const Panel = PANELS[panel];

    const resize = (next: number) => {
        const total = ref.current?.parentElement?.clientWidth ?? next;
        setWidth(Math.min(Math.max(next, MIN_WIDTH), total * MAX_SHARE));
    };

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ pointerX: event.clientX, width: ref.current?.offsetWidth ?? MIN_WIDTH });
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if(drag) resize(drag.width + event.clientX - drag.pointerX);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const move = KEY_MOVES[event.key];
        if(move === undefined) return;

        event.preventDefault();
        resize((ref.current?.offsetWidth ?? MIN_WIDTH) + move);
    };

    const style: PanelStyle = width === null ? {} : { '--panel-w': `${width}px` };

    return (
        <>
            <section ref={ref} className={classNames('panel', !panelOpen && 'collapsed')} aria-label='Panel' style={style}>
                <Panel />
            </section>
            <div
                className={classNames('resize', drag !== null && 'dragging')}
                role='separator'
                aria-orientation='vertical'
                aria-label='Resize panel'
                tabIndex={0}
                hidden={!panelOpen}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => setDrag(null)}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={onKeyDown}
            />
        </>
    );
};

export default PanelHost;
