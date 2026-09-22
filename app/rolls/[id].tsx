import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui/Screen';
import { colors, spacing, typography } from '../../src/constants/theme';
import { applePhotosProvider } from '../../src/features/photos/providers/ApplePhotosProvider';
import { AddPhotosButton } from '../../src/features/rolls/components/AddPhotosButton';
import { RollPhotoGrid } from '../../src/features/rolls/components/RollPhotoGrid';
import { useRoll } from '../../src/features/rolls/hooks/useRolls';
import { useRollStore } from '../../src/features/rolls/store/rollStore';
import { formatRollMonth } from '../../src/features/rolls/utils/rollMonth';

export default function RollDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const roll = useRoll(id);
  const addPhotosToRoll = useRollStore((state) => state.addPhotosToRoll);
  const [message, setMessage] = useState<string | null>(null);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);

  async function handleAddPhotos() {
    setIsPickingPhotos(true); setMessage(null);
    const result = await applePhotosProvider.pickMultiplePhotos();
    setIsPickingPhotos(false);
    if (result.status === 'permission-denied') { setMessage('FILMER needs Photos access to attach scanned photos to this roll.'); return; }
    if (result.status === 'selected') { addPhotosToRoll(id, result.photos); }
  }

  return <Screen><ScrollView contentContainerStyle={styles.container}>
    <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
    {roll ? <View>
      <Text style={styles.eyebrow}>ROLL DETAIL</Text><Text style={styles.title}>{roll.filmName}</Text><Text style={styles.camera}>{roll.cameraName}</Text>
      <View style={styles.details}>
        <DetailRow label="Format" value={roll.format + ' · ' + roll.frameCount + ' frames'} />
        <DetailRow label="Date" value={formatRollMonth(roll.date)} /><DetailRow label="Photos" value={String(roll.photos.length)} />
        {roll.notes ? <DetailRow label="Notes" value={roll.notes} /> : null}
      </View>
      <View style={styles.addPhotos}><AddPhotosButton loading={isPickingPhotos} onPress={handleAddPhotos} /></View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Text style={styles.photoHeading}>PHOTOS</Text>
      <RollPhotoGrid onPhotoPress={(photoId) => router.push({ pathname: '/rolls/[id]/photos/[photoId]', params: { id, photoId } })} photos={roll.photos} />
    </View> : <View style={styles.notFound}><Text style={styles.title}>Roll not found</Text><Text style={styles.description}>This roll is no longer available in your local archive.</Text></View>}
  </ScrollView></Screen>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingTop: spacing.md }, back: { color: colors.text, fontSize: 17, marginBottom: spacing.xl },
  eyebrow: { color: colors.secondaryText, fontSize: 11, fontWeight: typography.weight.bold, letterSpacing: 1.2 }, title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold, letterSpacing: -0.4, marginTop: spacing.sm }, camera: { color: colors.secondaryText, fontSize: typography.size.label, marginTop: 6 },
  details: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xl }, detailRow: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 15 }, detailLabel: { color: colors.secondaryText, fontSize: typography.size.small, marginBottom: spacing.xs }, detailValue: { color: colors.text, fontSize: 15, fontWeight: typography.weight.medium },
  addPhotos: { marginTop: spacing.lg }, message: { color: colors.secondaryText, fontSize: typography.size.small, lineHeight: 18, marginTop: spacing.sm }, photoHeading: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.bold, letterSpacing: 1.25, marginTop: spacing.xl }, notFound: { marginTop: 60 }, description: { color: colors.secondaryText, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
});
