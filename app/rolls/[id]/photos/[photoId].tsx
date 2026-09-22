import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../../src/components/ui/Screen';
import { colors, spacing, typography } from '../../../../src/constants/theme';
import { useRoll } from '../../../../src/features/rolls/hooks/useRolls';

export default function PhotoViewer() {
  const router = useRouter();
  const { id, photoId } = useLocalSearchParams<{ id: string; photoId: string }>();
  const roll = useRoll(id);
  const photoIndex = roll?.photos.findIndex((photo) => photo.id === photoId) ?? -1;
  const photo = photoIndex >= 0 ? roll?.photos[photoIndex] : undefined;
  const [unavailable, setUnavailable] = useState(!photo?.thumbnailUri);
  return <Screen><View style={styles.container}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
    {photo && roll ? <><Text style={styles.position}>{String(photoIndex + 1).padStart(2, '0')} / {roll.photos.length}</Text>{unavailable ? <View style={styles.unavailable}><Text style={styles.unavailableText}>Photo unavailable</Text></View> : <Image onError={() => setUnavailable(true)} source={{ uri: photo.thumbnailUri }} style={styles.image} />}</> : <Text style={styles.unavailableText}>Photo unavailable</Text>}
  </View></Screen>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, paddingTop: spacing.md }, back: { color: colors.text, fontSize: 17, marginBottom: spacing.md },
  position: { color: colors.secondaryText, fontSize: typography.size.small, fontWeight: typography.weight.semibold, textAlign: 'center' }, image: { flex: 1, marginVertical: spacing.md, resizeMode: 'contain', width: '100%' },
  unavailable: { alignItems: 'center', backgroundColor: colors.surface, flex: 1, justifyContent: 'center', marginVertical: spacing.md }, unavailableText: { color: colors.secondaryText, fontSize: typography.size.label, textAlign: 'center' },
});
