import { useMemo } from 'react';
import { useAppStore } from '../store/app-store';
import { colors, darkColors, type ThemeColors } from './colors';

export function useTheme(): ThemeColors {
  return useAppStore((state) => state.appearance) === 'dark' ? darkColors : colors;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
