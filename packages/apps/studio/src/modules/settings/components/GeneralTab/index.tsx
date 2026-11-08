import Group from '@/shared/components/Group';
import GroupRow from '@/shared/components/GroupRow';
import Popup from '@/shared/components/Popup';
import Toggle from '@/shared/components/Toggle';
import { EDITOR_CHOICES, EditorChoice, THEME_CHOICES, ThemeChoice } from '@/shared/contracts/preferences';
import { usePreferencesStore } from '@/shared/store/preferences';
import { useThemeStore } from '@/shared/store/theme';

const THEME_LABEL: Record<ThemeChoice, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark'
};

const EDITOR_LABEL: Record<EditorChoice, string> = {
    studio: 'VS Code in Studio',
    external: 'External editor'
};

const KEEP_RUNS = 'Keep runs going when Studio closes';
const NOTIFY = 'Notify when a run finishes or fails';

const GeneralTab = () => {
    const theme = useThemeStore((state) => state.choice);
    const chooseTheme = useThemeStore((state) => state.choose);
    const { keepRuns, notify, editor, setKeepRuns, setNotify, setEditor } = usePreferencesStore();

    const themeEntries = THEME_CHOICES.map((choice) => ({
        id: choice,
        label: THEME_LABEL[choice],
        checked: choice === theme,
        run: () => chooseTheme(choice)
    }));
    const editorEntries = EDITOR_CHOICES.map((choice) => ({
        id: choice,
        label: EDITOR_LABEL[choice],
        checked: choice === editor,
        run: () => setEditor(choice)
    }));

    return (
        <>
            <Group title='Appearance'>
                <GroupRow label='Theme'><Popup label='Theme' value={THEME_LABEL[theme]} entries={themeEntries} /></GroupRow>
            </Group>
            <Group title='Runs'>
                <GroupRow label={KEEP_RUNS}><Toggle label={KEEP_RUNS} checked={keepRuns} onChange={setKeepRuns} /></GroupRow>
                <GroupRow label={NOTIFY}><Toggle label={NOTIFY} checked={notify} onChange={setNotify} /></GroupRow>
            </Group>
            <Group title='Editor'>
                <GroupRow label='Open files in'><Popup label='Open files in' value={EDITOR_LABEL[editor]} entries={editorEntries} /></GroupRow>
            </Group>
        </>
    );
};

export default GeneralTab;
