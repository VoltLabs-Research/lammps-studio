import { useModalStore } from '@/shared/store/modal';
import { useEffect } from 'react';

export const useGlobalKeys = (onPalette: () => void) => {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if(event.key === 'Escape'){
                if(useModalStore.getState().closeTop()) event.preventDefault();
                return;
            }

            const modifier = event.ctrlKey || event.metaKey;
            if(modifier && !event.shiftKey && event.key.toLowerCase() === 'k'){
                event.preventDefault();
                onPalette();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onPalette]);
};
