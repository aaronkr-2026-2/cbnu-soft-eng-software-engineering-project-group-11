import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../../constants/theme';
import type { PhotoReference } from '../../photos/types';

type RollThumbnailStripProps = {
  photos: PhotoReference[];
};

export function RollThumbnailStrip({ photos }: RollThumbnailStripProps) {
  if (photos.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyText}>No photos added</Text></View>;
  }

  return (
    <View style={styles.container}>
      {photos.slice(0, 3).map((photo) => (
        <View key={photo.id} style={styles.thumbnail}>
          {photo.thumbnailUri ? (
            <Image source={{ uri: photo.thumbnailUri }} style={styles.image} />
          ) : (
            <Text style={styles.unavailable}>Unavailable</Text>
          )}
        </View>
      ))}
      {photos.length > 3 ? <View style={styles.morePhotos}><Text style={styles.morePhotosText}>+{photos.length - 3}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.xs + 2, marginTop: 14 },
  thumbnail: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.sm, flex: 1, height: 48, justifyContent: 'center', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  unavailable: { color: colors.secondaryText, fontSize: typography.size.micro },
  morePhotos: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    width: 48,
  },
  morePhotosText: {
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: typography.weight.semibold,
  },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.sm, borderWidth: StyleSheet.hairlineWidth, height: 48, justifyContent: 'center', marginTop: 14 },
  emptyText: { color: colors.secondaryText, fontSize: typography.size.small },
});
