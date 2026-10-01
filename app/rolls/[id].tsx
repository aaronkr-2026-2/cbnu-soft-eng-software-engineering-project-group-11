import { LocationPicker } from '../../src/features/location/components/LocationPicker';
import { isValidLocation, locationLabel } from '../../src/features/location/services/locationService';
import { createRollDetailStyles } from '../../src/features/rolls/styles/roll-detail.styles';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackButton } from '../../src/components/ui/BackButton';
import { Screen } from '../../src/components/ui/Screen';
import { useThemedStyles } from '../../src/constants/theme';
import { applePhotosProvider } from '../../src/features/photos/providers/ApplePhotosProvider';
import { PhotoViewerModal } from '../../src/features/photos/components/PhotoViewerModal';
import { ReorderablePhotoGrid } from '../../src/features/photos/components/ReorderablePhotoGrid';
import { useFilmStore } from '../../src/features/films/store/filmStore';
import type { TranslationKey } from '../../src/i18n/translations';
import { useRoll } from '../../src/features/rolls/hooks/useRolls';
import { useRollStore } from '../../src/features/rolls/store/rollStore';
import { formatRollMonth } from '../../src/features/rolls/utils/rollMonth';

export default function RollDetail() {
  const styles = useThemedStyles(createRollDetailStyles);

  const { t, language } = useTranslation();
  const router = useRouter();

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }
  const { id } = useLocalSearchParams<{ id: string }>();
  const roll = useRoll(id);
  const film = useFilmStore((state) => state.films.find((item) => item.id === roll?.filmId));
  const reorderPhotos = useRollStore((state) => state.reorderPhotos);
  const updatePhoto = useRollStore((state) => state.updatePhoto);
  const [locationVisible, setLocationVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const addPhotosToRoll = useRollStore((state) => state.addPhotosToRoll);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const photos = useMemo(
    () => roll ? [...roll.photos].sort((left, right) => left.sortOrder - right.sortOrder) : [],
    [roll?.photos],
  );

  async function handleAddPhotos() {
    if (isPickingPhotos) return;
    setIsPickingPhotos(true); setMessage(null);
    try {
      const result = await applePhotosProvider.pickMultiplePhotos();
      if (result.status === 'copy-unavailable') setMessage('copyUnavailable');
      if (result.status === 'permission-denied') setMessage('photoPermission');
      if (result.status === 'selected') addPhotosToRoll(id, result.photos);
    } catch { setMessage('photoError'); }
    finally { setIsPickingPhotos(false); }
  }

  return <Screen><ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.container}>
    <View style={styles.navigation}>
      <BackButton onPress={handleBack} />
      {roll ? <Pressable accessibilityRole="button" accessibilityLabel={t('editRoll')} style={styles.navButton} onPress={() => router.push({ pathname: '/rolls/[id]/edit', params: { id } })}><Text style={styles.editText}>{t('edit')}</Text></Pressable> : null}
    </View>
    {roll ? <View>
      <View style={styles.filmHeader}>
        {film?.imageUri || film?.imageUrl ? <Image source={{ uri: film.imageUri ?? film.imageUrl }} resizeMode="contain" style={styles.filmImage} /> : null}
        <Text style={styles.title}>{roll.filmName}</Text>
      </View>
      <View style={styles.details}>
        <DetailRow label={t('camera')} value={roll.cameraName} />
        <DetailRow label={t('format')} value={roll.format === 'other' ? t('other') : roll.format} />
        <DetailRow label={t('photoCount')} value={String(photos.length)} />
        <DetailRow label={t('date')} value={formatRollMonth(roll.date, language)} />
        <DetailRow label={t('lab')} value={roll.lab || '—'} />
        {isValidLocation(roll.location) ? <Pressable accessibilityRole="button" accessibilityLabel={t('location')} onPress={() => setLocationVisible(true)}><DetailRow label={t('location')} value={locationLabel(roll.location) + ' ›'} /></Pressable> : <DetailRow label={t('location')} value="—" />}
        {roll.notes ? <DetailRow label={t('notes')} value={roll.notes} /> : null}
      </View>
      <Text style={styles.photoHeading}>{t('photos')} · {photos.length}</Text>
      {message ? <Text style={styles.message}>{t(message)}</Text> : null}
      <ReorderablePhotoGrid adding={isPickingPhotos} onAdd={handleAddPhotos} onDraggingChange={setDragging} onReorder={(ids) => reorderPhotos(id, ids)} onPhotoPress={(_photo, index) => {
        setSelectedPhotoIndex(index);
        setViewerVisible(true);
      }} photos={photos} />
    </View> : <View style={styles.notFound}><Text style={styles.title}>{t('rollMissing')}</Text><Text style={styles.description}>{t('rollMissingInfo')}</Text></View>}
  </ScrollView>
    {locationVisible && isValidLocation(roll?.location) ? <LocationPicker mode="view" location={roll.location} onClose={() => setLocationVisible(false)} /> : null}
    <PhotoViewerModal visible={viewerVisible} photos={photos} initialIndex={selectedPhotoIndex} title={roll ? (isValidLocation(roll.location) ? locationLabel(roll.location) : roll.filmName) : ''} subtitle={roll ? formatRollMonth(roll.date, language) : undefined} onPhotoChange={(photoId, patch) => updatePhoto(id, photoId, patch)} onClose={() => setViewerVisible(false)} />
  </Screen>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createRollDetailStyles);

  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}
