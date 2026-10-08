import { FilmImage } from '../../src/features/films/components/FilmImage';
import { resolveRollFilm } from '../../src/features/films/utils/resolveRollFilm';
import { LocationPicker } from '../../src/features/location/components/LocationPicker';
import { isValidLocation, locationLabel } from '../../src/features/location/services/locationService';
import { createRollDetailStyles } from '../../src/features/rolls/styles/roll-detail.styles';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { BackButton } from '../../src/components/ui/BackButton';
import { Toast } from '../../src/components/ui/Toast';
import { Screen } from '../../src/components/ui/Screen';
import { useThemedStyles } from '../../src/constants/theme';
import { PhotoImportService } from '../../src/features/photos/services/PhotoImportService';
import { PhotoViewerModal } from '../../src/features/photos/components/PhotoViewerModal';
import { ReorderablePhotoGrid } from '../../src/features/photos/components/ReorderablePhotoGrid';
import { useFilmStore } from '../../src/features/films/store/filmStore';
import type { TranslationKey } from '../../src/i18n/translations';
import { useRoll } from '../../src/features/rolls/hooks/useRolls';
import { useRollStore } from '../../src/features/rolls/store/rollStore';
import { formatRollMonth } from '../../src/features/rolls/utils/rollMonth';
import type { Roll } from '../../src/features/rolls/types';
import { RollActionsMenu } from '../../src/features/rolls/components/RollActionsMenu';
import { ContactSheetPreview } from '../../src/features/contact-sheet/components/ContactSheetPreview';
import { usePhotoSelection } from '../../src/features/photos/hooks/usePhotoSelection';
import { PhotoSelectionControls } from '../../src/features/photos/components/PhotoSelectionControls';
import type { PhotoReference } from '../../src/features/photos/types';

export default function RollDetail() {
  const styles = useThemedStyles(createRollDetailStyles);
  const insets = useSafeAreaInsets();

  const { t, language } = useTranslation();
  const router = useRouter();

  function handleBack() {
    if (selection.selectionMode) { if (!batchBusy) selection.exit(); return; }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const roll = useRoll(id);
  const film = useFilmStore((state) => roll ? resolveRollFilm(state.films, roll) : undefined);
  const reorderPhotos = useRollStore((state) => state.reorderPhotos);
  const updatePhoto = useRollStore((state) => state.updatePhoto);
  const deleteRoll = useRollStore((state) => state.deleteRoll);
  const [contactSheetRoll, setContactSheetRoll] = useState<Roll | null>(null);
  const [locationVisible, setLocationVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [failedCopyCount, setFailedCopyCount] = useState(0);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [batchBusy, setBatchBusy] = useState(false);
  const photos = useMemo(
    () => roll ? [...roll.photos].sort((left, right) => left.sortOrder - right.sortOrder) : [],
    [roll?.photos],
  );
  const selection = usePhotoSelection(photos);
  usePreventRemove(selection.selectionMode, () => { if (!batchBusy) selection.exit(); });
  const openPhoto = useCallback((_photo: PhotoReference, index: number) => {
    if (selection.isSelecting()) return;
    setSelectedPhotoIndex(index); setViewerVisible(true);
  }, [selection.isSelecting]);
  const reorder = useCallback((ids: string[]) => reorderPhotos(id, ids), [id, reorderPhotos]);

  async function handleAddPhotos() {
    if (isPickingPhotos) return;
    setIsPickingPhotos(true); setMessage(null); setAddedCount(null); setFailedCopyCount(0);
    try {
      const result = await PhotoImportService.addToRoll(id);
      if (result.status === 'permission-denied') setMessage('photoPermission');
      if (result.status === 'selected') {
        if (result.addedCount > 0) setAddedCount(result.addedCount);
        setFailedCopyCount(result.failedCount);
      }
    } catch { setMessage('photoImportError'); }
    finally { setIsPickingPhotos(false); }
  }

  return <Screen><ScrollView scrollEnabled={!dragging} contentContainerStyle={[styles.container,
    selection.selectionMode && styles.selectionContent,
    selection.selectionMode && { paddingBottom: styles.selectionContent.paddingBottom + insets.bottom,
      paddingTop: styles.container.paddingTop + (Platform.OS === 'android' ? insets.top : 0) }]}>
    <View style={styles.navigation}>
      {selection.selectionMode ? <View style={styles.selectionNavigationSpacer} /> : <>
      <BackButton onPress={handleBack} />
      {roll ? <RollActionsMenu
        onSelect={() => { setViewerVisible(false); selection.enter(); }}
        onEdit={() => router.push({ pathname: '/rolls/[id]/edit', params: { id } })}
        onExport={() => setContactSheetRoll(roll)}
        onDelete={() => {
          try { if (deleteRoll(id)) router.replace('/'); }
          catch { Alert.alert(t('deleteRoll'), t('deleteRollError')); }
        }} /> : null}
      </>}
    </View>
    {roll ? <View>
      <View style={styles.filmHeader}>
        <FilmImage film={film} style={styles.filmImage} />
        <Text style={styles.title}>{film ? `${film.brand} ${film.name}` : roll.filmName}</Text>
      </View>
      <View style={styles.details}>
        {film ? <DetailRow label={t('filmDetailIso')} value={String(film.iso)} /> : null}
        <DetailRow label={t('camera')} value={roll.cameraName} />
        <DetailRow label={t('format')} value={roll.format === 'other' ? t('other') : roll.format} />
        <DetailRow label={t('frameCount')} value={roll.frameCount === undefined ? '—' : String(roll.frameCount)} />
        <DetailRow label={t('photoCount')} value={String(photos.length)} />
        <DetailRow label={t('date')} value={formatRollMonth(roll.date, language)} />
        <DetailRow label={t('lab')} value={roll.lab || '—'} />
        {isValidLocation(roll.location) ? <Pressable disabled={selection.selectionMode} accessibilityRole="button" accessibilityLabel={t('location')} onPress={() => setLocationVisible(true)}><DetailRow label={t('location')} value={locationLabel(roll.location) + ' ›'} /></Pressable> : <DetailRow label={t('location')} value="—" />}
        {roll.notes ? <DetailRow label={t('notes')} value={roll.notes} /> : null}
      </View>
      <Text style={styles.photoHeading}>{t('photos')} · {photos.length}</Text>
      {message ? <Text style={styles.message}>{t(message)}</Text> : null}
      {failedCopyCount > 0 ? <Text style={styles.message}>{t(failedCopyCount === 1 ? 'photoCopyFailureOne' : 'photoCopyFailureOther', { count: failedCopyCount })}</Text> : null}
      <ReorderablePhotoGrid adding={isPickingPhotos} onAdd={handleAddPhotos} onDraggingChange={setDragging} onReorder={reorder}
        onPhotoPress={openPhoto} photos={photos} selectionMode={selection.selectionMode} selectedIds={selection.selectedIds}
        onToggleSelection={selection.toggle} onSelectRange={selection.addRange} interactionDisabled={batchBusy} />
    </View> : <View style={styles.notFound}><Text style={styles.title}>{t('rollMissing')}</Text><Text style={styles.description}>{t('rollMissingInfo')}</Text></View>}
  </ScrollView>
    {selection.selectionMode ? <PhotoSelectionControls rollId={id} photos={selection.selectedPhotos}
      allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onExit={selection.exit} onBusyChange={setBatchBusy} /> : null}
    {saved ? <Toast key={saved} message={t('changesSaved')} /> : null}
    {addedCount !== null ? <Toast message={t(addedCount === 1 ? 'photoAddedToRoll' : 'photosAddedToRoll', { count: addedCount })} /> : null}
    {contactSheetRoll ? <ContactSheetPreview roll={contactSheetRoll} onClose={() => setContactSheetRoll(null)} /> : null}
    {locationVisible && isValidLocation(roll?.location) ? <LocationPicker mode="view" location={roll.location} onClose={() => setLocationVisible(false)} /> : null}
    <PhotoViewerModal visible={viewerVisible && !selection.selectionMode} photos={photos} initialIndex={selectedPhotoIndex} title={roll ? (isValidLocation(roll.location) ? locationLabel(roll.location) : roll.filmName) : ''} subtitle={roll ? formatRollMonth(roll.date, language) : undefined} onPhotoChange={(photoId, patch) => updatePhoto(id, photoId, patch)} onClose={() => setViewerVisible(false)} />
  </Screen>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createRollDetailStyles);

  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}
