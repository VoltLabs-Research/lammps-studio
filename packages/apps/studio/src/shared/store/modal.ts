import { ReactNode } from 'react';
import { create } from 'zustand';

export interface ModalEntry{
    key: string;
    content: ReactNode;
    close: () => void;
}

interface StackedModal extends ModalEntry{
    opener: HTMLElement | null;
}

interface ModalState{
    stack: StackedModal[];
    open: (key: string, content: ReactNode) => void;
    close: (key: string) => void;
    closeTop: () => boolean;
}

const focusedElement = (): HTMLElement | null => (document.activeElement instanceof HTMLElement ? document.activeElement : null);

export const useModalStore = create<ModalState>((set, get) => ({
    stack: [],
    open: (key, content) => set((state) => {
        const previous = state.stack.find((entry) => entry.key === key);
        const entry: StackedModal = {
            key,
            content,
            close: () => get().close(key),
            opener: previous ? previous.opener : focusedElement()
        };

        return { stack: [...state.stack.filter((other) => other.key !== key), entry] };
    }),
    close: (key) => {
        const entry = get().stack.find((other) => other.key === key);
        if(!entry) return;

        set((state) => ({ stack: state.stack.filter((other) => other.key !== key) }));
        if(entry.opener?.isConnected) entry.opener.focus({ preventScroll: true });
    },
    closeTop: () => {
        const top = get().stack.at(-1);
        if(!top) return false;

        get().close(top.key);

        return true;
    }
}));

export const openModal = (key: string, content: ReactNode) => useModalStore.getState().open(key, content);
