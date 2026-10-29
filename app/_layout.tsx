import { CloudRestoreNotice } from '../src/features/cloud/components/CloudRestoreNotice';
import { startCloudSync } from '../src/features/cloud/services/cloudSync';
import { useFilmStore } from '../src/features/films/store/filmStore';
import { useCameraStore } from '../src/features/cameras/store/cameraStore';
import { useRollStore } from '../src/features/rolls/store/rollStore';
import { ArchiveRecoveryScreen } from '../src/features/rolls/components/ArchiveRecoveryScreen';
import { useCallback, useEffect, useState } from 'react';
import { StartupScreen } from '../src/features/startup/StartupScreen';
import { Appearance } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { rootLayoutStyles } from '../src/components/ui/styles/root-layout.styles';
import { useColorMode, useTheme } from '../src/constants/theme';
import { useAppStore } from '../src/store/app-store';
// Anchor direct links to Home while allowing the requested screen to open.
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  useEffect(() => startCloudSync(), []);
  const [ready, setReady] = useState(false);
  const finishStartup = useCallback(() => setReady(true), []);
  const archive = useRollStore(state => state.archive);
  const filmArchive = useFilmStore(state => state.archive);
  const cameraArchive = useCameraStore(state => state.archive);
  const catalogArchive = filmArchive.status === 'recovery' ? filmArchive : cameraArchive.status === 'recovery' ? cameraArchive : undefined;
  const colors = useTheme();
  const appearance = useAppStore((state) => state.appearance);
  // Native alerts, sheets and pickers follow the same choice; 'unspecified' hands control back to iOS.
  useEffect(() => { Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance); }, [appearance]);
  const mode = useColorMode();
  return <GestureHandlerRootView style={rootLayoutStyles.root}><StatusBar style={mode === 'dark' ? 'light' : 'dark'} />{archive.status === 'recovery' ? <ArchiveRecoveryScreen /> : catalogArchive ? <ArchiveRecoveryScreen catalog archiveOverride={catalogArchive} onRetry={() => { useFilmStore.getState().retryLoad(); useCameraStore.getState().retryLoad(); }} /> : !ready ? <StartupScreen onReady={finishStartup} /> : <Stack initialRouteName="index" screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="settings" />
  </Stack>}{ready && archive.status === 'ready' && !catalogArchive && <CloudRestoreNotice />}</GestureHandlerRootView>;
}
