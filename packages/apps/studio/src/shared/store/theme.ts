import { THEME_CHOICES, ThemeChoice } from '@/shared/contracts/preferences';
import { readChoice, writeValue } from '@/shared/utils/storage';
import { create } from 'zustand';

interface ThemeState{
    choice: ThemeChoice;
    choose: (choice: ThemeChoice) => void;
}

const THEME_KEY = 'lammps-studio.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const applyTheme = (choice: ThemeChoice) => {
    const root = document.documentElement;
    if(choice === 'system'){
        delete root.dataset.theme;
        return;
    }

    root.dataset.theme = choice;
};

export const isDark = (choice: ThemeChoice): boolean => {
    if(choice === 'system') return window.matchMedia(DARK_QUERY).matches;

    return choice === 'dark';
};

export const useThemeStore = create<ThemeState>((set) => ({
    choice: readChoice(THEME_KEY, THEME_CHOICES, 'system'),
    choose: (choice) => {
        writeValue(THEME_KEY, choice);
        applyTheme(choice);
        set({ choice });
    }
}));
