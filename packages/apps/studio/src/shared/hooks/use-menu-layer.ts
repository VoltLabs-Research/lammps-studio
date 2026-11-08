import { MenuAlign, MenuAnchor } from '@/shared/contracts/menu';
import { anchorRectOf, placeMenu } from '@/shared/utils/menu-position';
import { RefObject, useEffect, useLayoutEffect } from 'react';

export const useMenuLayer = (ref: RefObject<HTMLDivElement | null>, anchor: MenuAnchor | null, align: MenuAlign, close: () => void) => {
    useLayoutEffect(() => {
        const element = ref.current;
        if(!element || !anchor) return;

        const position = placeMenu(
            anchorRectOf(anchor),
            { width: element.offsetWidth, height: element.offsetHeight },
            { width: window.innerWidth, height: window.innerHeight },
            anchor instanceof HTMLElement ? align : 'left'
        );
        element.style.left = `${position.x}px`;
        element.style.top = `${position.y}px`;
        element.focus({ preventScroll: true });
    }, [ref, anchor, align]);

    useEffect(() => {
        if(!anchor) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target;
            if(!(target instanceof Node) || ref.current?.contains(target)) return;
            if(anchor instanceof HTMLElement && anchor.contains(target)) return;

            close();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('resize', close);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('resize', close);
        };
    }, [ref, anchor, close]);
};
