import { create } from 'zustand';

export type LoadStatus = 'loading' | 'ready' | 'failed';

export interface ListState<T>{
    items: T[];
    status: LoadStatus;
    error: unknown;
    load: () => Promise<void>;
    upsert: (item: T) => void;
    remove: (key: string) => void;
}

export const createListStore = <T>(fetchAll: () => Promise<T[]>, keyOf: (item: T) => string) => create<ListState<T>>((set) => ({
    items: [],
    status: 'loading',
    error: null,
    load: async () => {
        try{
            const items = await fetchAll();
            set({ items, status: 'ready', error: null });
        }catch(error){
            set({ status: 'failed', error });
        }
    },
    upsert: (item) => set((state) => {
        const key = keyOf(item);
        const exists = state.items.some((other) => keyOf(other) === key);
        if(!exists) return { items: [...state.items, item] };

        return { items: state.items.map((other) => (keyOf(other) === key ? item : other)) };
    }),
    remove: (key) => set((state) => ({ items: state.items.filter((item) => keyOf(item) !== key) }))
}));
