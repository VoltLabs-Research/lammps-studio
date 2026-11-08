import { MenuAnchor, OpenMenu } from '@/shared/contracts/menu';
import { create } from 'zustand';

interface MenuState{
    active: OpenMenu | null;
    open: (key: string, anchor: MenuAnchor) => void;
    close: (key: string) => void;
}

export const useMenuStore = create<MenuState>((set) => ({
    active: null,
    open: (key, anchor) => set({ active: { key, anchor } }),
    close: (key) => set((state) => (state.active?.key === key ? { active: null } : state))
}));
