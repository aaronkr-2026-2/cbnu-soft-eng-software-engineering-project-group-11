import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../../constants/theme';
import type { Camera } from '../../../types/models';

type CameraCardProps = { camera: Camera; onPress: () => void; selected: boolean };

export function CameraCard({ camera, onPress, selected }: CameraCardProps) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.card, selected && styles.selected]}>
    <View style={styles.imageArea}>{camera.imageUrl ? <Image source={{ uri: camera.imageUrl }} style={styles.image} /> : <Text style={styles.placeholder}>CAMERA</Text>}</View>
    <Text style={styles.brand}>{camera.brand}</Text><Text numberOfLines={1} style={styles.name}>{camera.model}</Text><Text style={styles.meta}>{camera.format ?? '35mm'}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, height: 210, padding: spacing.sm, width: 154 },
  selected: { borderColor: colors.text, borderWidth: 1.5 },
  imageArea: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, height: 112, justifyContent: 'center', marginBottom: spacing.sm, overflow: 'hidden' },
  image: { height: '100%', width: '100%' }, placeholder: { color: colors.secondaryText, fontSize: typography.size.micro, fontWeight: typography.weight.bold, letterSpacing: 1 },
  brand: { color: colors.secondaryText, fontSize: typography.size.small }, name: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold, marginTop: 1 }, meta: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xxs },
});
