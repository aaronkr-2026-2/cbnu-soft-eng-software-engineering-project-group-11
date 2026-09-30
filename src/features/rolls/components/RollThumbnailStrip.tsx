import { useTranslation } from '../../../i18n/useTranslation';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, type ThemeColors, radii, spacing, typography } from '../../../constants/theme';
import type { PhotoReference } from '../../photos/types';

type RollThumbnailStripProps = {
  photos: PhotoReference[];
};

const visibleCount = 4;

export function RollThumbnailStrip({ photos }: RollThumbnailStripProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  if (photos.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyText}>{t('noPhotos')}</Text></View>;
  }

  const sorted = [...photos].sort((left, right) => left.sortOrder - right.sortOrder);
  const visible = sorted.slice(0, visibleCount);
  const hidden = photos.length - visible.length;

  return (
    <View style={styles.container}>
      {visible.map((photo, index) => (
        <View key={photo.id} style={styles.thumbnail}>
          {photo.thumbnailUri ? (
            <Image source={{ uri: photo.thumbnailUri }} style={styles.image} />
          ) : (
            <Text style={styles.unavailable}>{t('unavailable')}</Text>
          )}
          {hidden > 0 && index === visible.length - 1 ? (
            <View style={styles.moreOverlay}><Text style={styles.moreText}>+{hidden}</Text></View>
          ) : null}
        </View>
      ))}
      {Array.from({ length: visibleCount - visible.length }, (_, index) => <View key={`spacer-${index}`} style={styles.spacer} />)}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.sm - 2, marginTop: 14 },
  thumbnail: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spacer: { aspectRatio: 1, flex: 1 },
  image: { height: '100%', width: '100%' },
  unavailable: { color: colors.secondaryText, fontSize: typography.size.micro },
  moreOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  moreText: { color: '#FFFFFF', fontSize: typography.size.label, fontWeight: typography.weight.bold },
  empty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginTop: 14,
  },
  emptyText: { color: colors.secondaryText, fontSize: typography.size.small },
});
