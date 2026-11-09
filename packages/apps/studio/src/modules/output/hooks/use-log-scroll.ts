import { RefObject, useLayoutEffect, useRef, useState } from 'react';
import { LogScroll, LogScrollInput, LogScrollMark } from '@/modules/output/domain/log';
import { awayFromBottom, scrollJump } from '@/modules/output/utils/log-scroll';

export const useLogScroll = (ref: RefObject<HTMLDivElement | null>, { count, follow, resetKey, startAtTop, onUnfollow }: LogScrollInput): LogScroll => {
    const [scrollTop, setScrollTop] = useState(0);
    const [viewport, setViewport] = useState(0);
    const placed = useRef<number | null>(null);
    const mark = useRef<LogScrollMark | null>(null);

    useLayoutEffect(() => {
        const body = ref.current;
        if(!body) return;

        const observer = new ResizeObserver(() => setViewport(body.clientHeight));
        observer.observe(body);
        setViewport(body.clientHeight);

        return () => observer.disconnect();
    }, [ref]);

    useLayoutEffect(() => {
        const body = ref.current;
        if(!body) return;

        const next = { resetKey, count, follow };
        const jump = scrollJump(mark.current, next, startAtTop);
        mark.current = next;
        if(jump === null) return;

        body.scrollTop = jump === 'top' ? 0 : body.scrollHeight;
        placed.current = body.scrollTop;
        setScrollTop(body.scrollTop);
    }, [ref, resetKey, count, follow, startAtTop]);

    const onScroll = () => {
        const body = ref.current;
        if(!body) return;

        setScrollTop(body.scrollTop);
        if(placed.current === body.scrollTop) return;

        placed.current = null;
        if(follow && awayFromBottom(body)) onUnfollow();
    };

    return {
        scrollTop,
        viewport,
        onScroll
    };
};
