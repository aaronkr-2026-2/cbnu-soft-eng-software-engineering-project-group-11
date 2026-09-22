import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../../constants/theme';
import type { PhotoReference } from '../../photos/types';

type RollPhotoGridProps = {
  onPhotoPress: (photoId: string) => void;
  photos: PhotoReference[];
};

export function RollPhotoGrid({ onPhotoPress, photos }: RollPhotoGridProps) {
  if (photos.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No photos attached</Text>
        <Text style={styles.emptyText}>Add scanned photos from your iPhone library.</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {photos
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((photo) => (
          <PhotoTile key={photo.id} onPress={() => onPhotoPress(photo.id)} photo={photo} />
        ))}
    </View>
  );
}

function PhotoTile({
  onPress,
  photo,
}: {
  onPress: () => void;
  photo: PhotoReference;
}) {
  const [unavailable, setUnavailable] = useState(!photo.thumbnailUri);

  return (
    <Pressable
      accessibilityLabel="Open photo"
      accessibilityRole="button"
      onPress={onPress}
      style={styles.tile}
    >
      {unavailable ? (
        <View style={styles.unavailable}>
          <Text style={styles.unavailableText}>Unavailable</Text>
        </View>
      ) : (
        <Image
          onError={() => setUnavailable(true)}
          source={{ uri: photo.thumbnailUri }}
          style={styles.image}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tile: {
    aspectRatio: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    width: '31%',
  },
  image: { height: '100%', width: '100%' },
  unavailable: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xs,
  },
  unavailableText: { color: colors.secondaryText, fontSize: typography.size.micro, textAlign: 'center' },
  emptyState: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingVertical: 28,
  },
  emptyTitle: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
  emptyText: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xs },
});
