import { EDITOR_CHOICES, EditorChoice } from '@/shared/contracts/preferences';
import { readChoice, readFlag, writeValue } from '@/shared/utils/storage';
import { create } from 'zustand';

interface PreferencesState{
    keepRuns: boolean;
    notify: boolean;
    editor: EditorChoice;
    setKeepRuns: (keepRuns: boolean) => void;
    setNotify: (notify: boolean) => void;
    setEditor: (editor: EditorChoice) => void;
}

const KEEP_RUNS_KEY = 'lammps-studio.keep-runs';
const NOTIFY_KEY = 'lammps-studio.notify';
const EDITOR_KEY = 'lammps-studio.editor';

export const usePreferencesStore = create<PreferencesState>((set) => ({
    keepRuns: readFlag(KEEP_RUNS_KEY, true),
    notify: readFlag(NOTIFY_KEY, true),
    editor: readChoice(EDITOR_KEY, EDITOR_CHOICES, 'studio'),
    setKeepRuns: (keepRuns) => {
        writeValue(KEEP_RUNS_KEY, keepRuns);
        set({ keepRuns });
    },
    setNotify: (notify) => {
        writeValue(NOTIFY_KEY, notify);
        set({ notify });
    },
    setEditor: (editor) => {
        writeValue(EDITOR_KEY, editor);
        set({ editor });
    }
}));
