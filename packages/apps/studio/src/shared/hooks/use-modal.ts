import { createContext, useContext } from 'react';
import { UiErrors } from '@/shared/contracts/errors';
import { defineErrors } from '@/shared/errors/define-errors';
import { ModalEntry } from '@/shared/store/modal';

const uiError = defineErrors(UiErrors);

export const ModalContext = createContext<ModalEntry | null>(null);

export const useModal = (): ModalEntry => {
    const entry = useContext(ModalContext);
    if(!entry) throw uiError('OutsideModalRoot');

    return entry;
};
