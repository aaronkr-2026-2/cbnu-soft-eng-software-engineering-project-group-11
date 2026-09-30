import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/constants/theme';
import { useAppStore } from '../src/store/app-store';
// Anchor direct links to Home while allowing the requested screen to open.
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  const colors = useTheme();
  const appearance = useAppStore((state) => state.appearance);
  useEffect(() => { Appearance.setColorScheme(appearance); }, [appearance]);
  return <><StatusBar style={appearance === 'dark' ? 'light' : 'dark'} /><Stack initialRouteName="index" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="settings" />
  </Stack></>;
}
