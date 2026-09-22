import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/ui/Screen';
import { colors, spacing, typography } from '../src/constants/theme';
import { CameraCard } from '../src/features/cameras/components/CameraCard';
import { cameras } from '../src/features/cameras/data/cameras';

export default function Cameras() {
  const router = useRouter();
  return <Screen><ScrollView contentContainerStyle={styles.content}><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.title}>Cameras</Text><View style={styles.grid}>{cameras.map((camera) => <CameraCard camera={camera} key={camera.id} onPress={() => router.replace({ pathname: '/new-roll', params: { cameraId: camera.id } })} selected={false} />)}</View></ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: spacing.screen, paddingTop: spacing.md }, back: { color: colors.text, fontSize: 17, marginBottom: spacing.lg }, title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg } });
