import { ModalFocus } from '@/shared/contracts/ui';
import { focusablesIn } from '@/shared/utils/focus-trap';
import { RefObject, useEffect } from 'react';

const CLOSE_BUTTON = '.modal__close';

export const useInitialFocus = (ref: RefObject<HTMLElement | null>, initialFocus: ModalFocus) => {
    useEffect(() => {
        const dialog = ref.current;
        if(!dialog || dialog.contains(document.activeElement)) return;

        const first = focusablesIn(dialog).find((element) => !element.matches(CLOSE_BUTTON));
        const target = initialFocus === 'first' && first ? first : dialog;
        target.focus({ preventScroll: true });
    }, [ref, initialFocus]);
};
