import { useTranslation } from '../../../i18n/useTranslation';
import { Image, Text, View } from 'react-native';

import { useThemedStyles } from '../../../constants/theme';
import type { PhotoReference } from '../../photos/types';
import { useResolvedPhoto } from '../../photos/hooks/useResolvedPhoto';
import { PhotoResolutionStatus } from '../../photos/components/PhotoResolutionStatus';
import { createRollThumbnailStripStyles } from '../styles/roll-thumbnail-strip.styles';

type RollThumbnailStripProps = {
  photos: PhotoReference[];
};

const visibleCount = 4;

export function RollThumbnailStrip({ photos }: RollThumbnailStripProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createRollThumbnailStripStyles);

  if (photos.length === 0) {
    return <View style={styles.empty}><Text style={styles.emptyText}>{t('noPhotos')}</Text></View>;
  }

  const sorted = [...photos].sort((left, right) => left.sortOrder - right.sortOrder);
  const visible = sorted.slice(0, visibleCount);
  const hidden = photos.length - visible.length;

  return (
    <View style={styles.container}>
      {visible.map((photo, index) => {
        return (
          <View key={photo.id} style={styles.thumbnail}>
            <Thumbnail photo={photo} />
            {hidden > 0 && index === visible.length - 1 ? (
              <View style={styles.moreOverlay}><Text style={styles.moreText}>+{hidden}</Text></View>
            ) : null}
          </View>
        );
      })}
      {Array.from({ length: visibleCount - visible.length }, (_, index) => <View key={`spacer-${index}`} style={styles.spacer} />)}
    </View>
  );
}

function Thumbnail({ photo }: { photo: PhotoReference }) {
  const styles = useThemedStyles(createRollThumbnailStripStyles);
  const resolution = useResolvedPhoto(photo);
  return resolution.uri ? <Image source={{ uri: resolution.uri }} style={styles.image} onError={resolution.failed} />
    : <PhotoResolutionStatus status={resolution.status} />;
}
