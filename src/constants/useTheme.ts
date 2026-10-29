import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/app-store';
import { resolveColorMode, type ColorMode } from './colorMode';
import { colors, darkColors, type ThemeColors } from './colors';

export function useColorMode(): ColorMode {
  return resolveColorMode(useAppStore((state) => state.appearance), useColorScheme());
}

export function useTheme(): ThemeColors {
  return useColorMode() === 'dark' ? darkColors : colors;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
