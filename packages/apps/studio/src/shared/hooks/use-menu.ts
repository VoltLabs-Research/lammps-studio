import { MenuHandle, Point } from '@/shared/contracts/menu';
import { useMenuStore } from '@/shared/store/menu';
import { useEffect, useId, useMemo } from 'react';

export const useMenu = (): MenuHandle => {
    const key = useId();
    const anchor = useMenuStore((state) => (state.active?.key === key ? state.active.anchor : null));

    const actions = useMemo(() => ({
        toggle: (element: HTMLElement) => {
            const { active, open, close } = useMenuStore.getState();
            if(active?.key === key){
                close(key);
                return;
            }

            open(key, element);
        },
        openAt: (point: Point) => useMenuStore.getState().open(key, point),
        close: () => useMenuStore.getState().close(key)
    }), [key]);

    useEffect(() => actions.close, [actions]);

    return {
        anchor,
        ...actions
    };
};
