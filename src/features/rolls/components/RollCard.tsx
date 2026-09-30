import { useTranslation } from '../../../i18n/useTranslation';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../../components/ui/Card';
import { useThemedStyles, type ThemeColors, radii, spacing, typography } from '../../../constants/theme';
import { isValidLocation, locationLabel } from '../../location/services/locationService';
import type { Roll } from '../types';
import { RollThumbnailStrip } from './RollThumbnailStrip';
import { formatRollMonth } from '../utils/rollMonth';

type RollCardProps = {
  onPress: () => void;
  roll: Roll;
};

export function RollCard({ onPress, roll }: RollCardProps) {
  const { t, language } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const meta = [
    roll.format === 'other' ? t('other') : roll.format,
    formatRollMonth(roll.date, language),
    isValidLocation(roll.location) ? locationLabel(roll.location) : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <Card
      accessibilityLabel={t('openRoll', { name: roll.filmName })}
      onPress={onPress}
      pressedStyle={styles.pressed}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.filmName}>{roll.filmName}</Text>
          <Text numberOfLines={1} style={styles.cameraName}>{roll.cameraName}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countValue}>{roll.photos.length}</Text>
          <Text style={styles.countUnit}>{t('photoUnit')}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {meta.map((item) => (
          <View key={item} style={styles.metaChip}>
            <Text numberOfLines={1} style={styles.metaText}>{item}</Text>
          </View>
        ))}
      </View>

      <RollThumbnailStrip photos={roll.photos} />
    </Card>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  titleBlock: { flex: 1 },
  filmName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: typography.weight.bold,
    letterSpacing: -0.3,
  },
  cameraName: { color: colors.secondaryText, fontSize: typography.size.body, marginTop: spacing.xxs },
  countBadge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countValue: {
    color: colors.background,
    fontSize: typography.size.label,
    fontWeight: typography.weight.bold,
  },
  countUnit: {
    color: colors.background,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    opacity: 0.8,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  metaChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaText: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.medium },
});
