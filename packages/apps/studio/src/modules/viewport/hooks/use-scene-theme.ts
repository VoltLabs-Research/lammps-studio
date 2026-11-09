import { useSyncExternalStore } from 'react';
import type { ThemeName } from '@/modules/viewport/domain/scene';
import { currentTheme } from '@/modules/viewport/utils/theme-tokens';
import { watchTheme } from '@/modules/viewport/utils/watch-theme';

export const useSceneTheme = (): ThemeName => useSyncExternalStore(watchTheme, currentTheme);
