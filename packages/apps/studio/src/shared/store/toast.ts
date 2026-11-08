import { create } from 'zustand';

interface Toast{
    id: number;
    message: string;
}

interface ToastState{
    current: Toast | null;
    show: (message: string) => void;
}

const LIFETIME_MS = 2800;

let issued = 0;

export const useToastStore = create<ToastState>((set) => ({
    current: null,
    show: (message) => {
        issued += 1;
        const id = issued;
        set({ current: { id, message } });
        setTimeout(() => set((state) => (state.current?.id === id ? { current: null } : state)), LIFETIME_MS);
    }
}));

export const toast = (message: string) => useToastStore.getState().show(message);
