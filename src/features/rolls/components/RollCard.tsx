import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../../components/ui/Card';
import { colors, radii, spacing, typography } from '../../../constants/theme';
import type { Roll } from '../types';
import { RollThumbnailStrip } from './RollThumbnailStrip';
import { formatRollMonth } from '../utils/rollMonth';

type RollCardProps = {
  onPress: () => void;
  roll: Roll;
};

export function RollCard({ onPress, roll }: RollCardProps) {
  return (
    <Card
      accessibilityLabel={`Open ${roll.filmName} roll`}
      onPress={onPress}
      pressedStyle={styles.pressed}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.filmName}>{roll.filmName}</Text>
          <Text style={styles.cameraName}>{roll.cameraName}</Text>
        </View>
        <Text style={styles.photoCount}>{roll.photos.length} PHOTOS</Text>
      </View>

      <Text style={styles.rollDetails}>{roll.format} · {roll.frameCount} frames</Text>
      <Text style={styles.locationDate}>{formatRollMonth(roll.date)}</Text>
      <RollThumbnailStrip photos={roll.photos} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
  },
  pressed: { opacity: 0.72 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between' },
  filmName: {
    color: colors.text,
    fontSize: typography.size.label,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.2,
  },
  cameraName: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xxs },
  photoCount: {
    color: colors.secondaryText,
    fontSize: typography.size.micro,
    fontWeight: typography.weight.bold,
    letterSpacing: 0.65,
    marginTop: spacing.xxs,
  },
  rollDetails: { color: colors.text, fontSize: typography.size.small, marginTop: 15 },
  locationDate: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xxs },
});
