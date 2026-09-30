import { useTranslation } from '../../../i18n/useTranslation';
import { useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import type { PhotoReference } from '../types';

type PhotoViewerModalProps = {
  visible: boolean;
  photos: PhotoReference[];
  initialIndex: number;
  onClose: () => void;
};

export function PhotoViewerModal({ visible, photos, initialIndex, onClose }: PhotoViewerModalProps) {
  // Unmount paging state on close so every opening starts at the tapped thumbnail.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaProvider>
        <Viewer photos={photos} initialIndex={initialIndex} onClose={onClose} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Viewer({ photos, initialIndex, onClose }: Omit<PhotoViewerModalProps, 'visible'>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, Math.min(initialIndex, photos.length - 1)));
  const index = Math.min(currentIndex, Math.max(0, photos.length - 1));
  const digits = Math.max(2, String(photos.length).length);

  return (
    <SafeAreaView style={styles.backdrop}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('closeViewer')} onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
        <Text accessibilityLabel={t('photoPosition', { current: photos.length ? index + 1 : 0, total: photos.length })} style={styles.counter}>
          {String(photos.length ? index + 1 : 0).padStart(digits, '0')} / {String(photos.length).padStart(digits, '0')}
        </Text>
      </View>
      <FlatList
        // Recreate the pager at the current photo if the window width changes.
        key={width}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(photo) => photo.id}
        initialScrollIndex={photos.length ? index : undefined}
        getItemLayout={(_data, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        onMomentumScrollEnd={(event) => setCurrentIndex(Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))}
        initialNumToRender={1}
        maxToRenderPerBatch={3}
        windowSize={3}
        style={styles.pager}
        renderItem={({ item }) => <PhotoPage photo={item} width={width} />}
        ListEmptyComponent={<View style={[styles.page, { width }]}><Text style={styles.unavailable}>{t('photoUnavailable')}</Text></View>}
      />
    </SafeAreaView>
  );
}

function PhotoPage({ photo, width }: { photo: PhotoReference; width: number }) {
  const { t } = useTranslation();
  const [failedUri, setFailedUri] = useState<string>();
  // The existing photo provider stores the picker display URI on the reference.
  const uri = photo.thumbnailUri;

  return (
    <View style={[styles.page, { width }]}>
      {!uri || failedUri === uri ? <Text style={styles.unavailable}>{t('photoUnavailable')}</Text> : (
        <Image source={{ uri }} resizeMode="contain" onError={() => setFailedUri(uri)} accessibilityLabel={t('rollPhoto')} style={styles.image} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 32, lineHeight: 36 },
  counter: { color: '#fff', fontSize: 14, fontVariant: ['tabular-nums'] },
  pager: { flex: 1 },
  page: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  unavailable: { color: '#ddd', fontSize: 16 },
});
