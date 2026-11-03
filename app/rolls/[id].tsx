import { applePhotosProvider } from '../../src/features/photos/providers/ApplePhotosProvider';
import { invalidatePhotoRenders, photoModuleAvailable } from '../../src/features/photos/services/PhotoReferenceService';
import { FilmImage } from '../../src/features/films/components/FilmImage';
import { FilmInfoSheet } from '../../src/features/films/components/FilmInfoSheet';
import { resolveRollFilm } from '../../src/features/films/utils/resolveRollFilm';
import { LocationPicker } from '../../src/features/location/components/LocationPicker';
import { isValidLocation, locationLabel } from '../../src/features/location/services/locationService';
import { createRollDetailStyles } from '../../src/features/rolls/styles/roll-detail.styles';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Platform, Pressable, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { BackButton } from '../../src/components/ui/BackButton';
import { Toast } from '../../src/components/ui/Toast';
import { Screen } from '../../src/components/ui/Screen';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTheme, useThemedStyles } from '../../src/constants/theme';
import { PhotoImportService } from '../../src/features/photos/services/PhotoImportService';
import { PhotoViewerModal } from '../../src/features/photos/components/PhotoViewerModal';
import { ReorderablePhotoGrid } from '../../src/features/photos/components/ReorderablePhotoGrid';
import { useFilmStore } from '../../src/features/films/store/filmStore';
import type { TranslationKey } from '../../src/i18n/translations';
import { useRoll } from '../../src/features/rolls/hooks/useRolls';
import { useRollStore } from '../../src/features/rolls/store/rollStore';
import { filmExpiryStatus, formatRollMonth, type FilmExpiryStatus } from '../../src/features/rolls/utils/rollMonth';
import type { Roll } from '../../src/features/rolls/types';
import { RollActionsMenu } from '../../src/features/rolls/components/RollActionsMenu';
import { RollTextEditor } from '../../src/features/rolls/components/RollTextEditor';
import { ContactSheetPreview } from '../../src/features/contact-sheet/components/ContactSheetPreview';
import { usePhotoSelection } from '../../src/features/photos/hooks/usePhotoSelection';
import { PhotoSelectionControls } from '../../src/features/photos/components/PhotoSelectionControls';
import { PhotoImportGuide } from '../../src/features/photos/components/PhotoImportGuide';
import { useAppStore } from '../../src/store/app-store';
import type { PhotoDetailsPatch, PhotoReference } from '../../src/features/photos/types';

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
  const [quickEditor, setQuickEditor] = useState<'notes' | 'lab' | null>(null);
  const [viewport, setViewport] = useState({ top: 0, height: Dimensions.get('window').height });
  const [contentY, setContentY] = useState(0);
  const [scrollY] = useState(() => new Animated.Value(0));
  const reduceMotion = useReducedMotion();
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const [filmInfoVisible, setFilmInfoVisible] = useState(false);
  const collapseEnd = headerBottom === null ? 100000 : contentY + headerBottom;
  const collapseStart = Math.max(0, collapseEnd - 44);
  const compactOpacity = scrollY.interpolate({ inputRange: [collapseStart, collapseEnd], outputRange: [0, 1], extrapolate: 'clamp' });
  const compactTranslateY = scrollY.interpolate({ inputRange: [collapseStart, collapseEnd], outputRange: [12, 0], extrapolate: 'clamp' });
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [isPickingPhotos, setIsPickingPhotos] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [batchBusy, setBatchBusy] = useState(false);
  const photoGuideSeen = useAppStore((state) => state.photoGuideSeen);
  const markPhotoGuideSeen = useAppStore((state) => state.markPhotoGuideSeen);
  const [guideVisible, setGuideVisible] = useState(false);
  const pickAfterGuide = useRef(false);
  const rollPhotos = roll?.photos;
  const photos = useMemo(
    () => rollPhotos ? [...rollPhotos].sort((left, right) => left.sortOrder - right.sortOrder) : [],
    [rollPhotos],
  );
  const selection = usePhotoSelection(photos);
  usePreventRemove(selection.selectionMode, () => { if (!batchBusy) selection.exit(); });
  const isSelecting = selection.isSelecting;
  const openPhoto = useCallback((_photo: PhotoReference, index: number) => {
    if (isSelecting()) return;
    setSelectedPhotoIndex(index); setViewerVisible(true);
  }, [isSelecting, setSelectedPhotoIndex, setViewerVisible]);
  // A failed save leaves the store unchanged; report it so the grid can return to the saved order.
  const reorder = useCallback((ids: string[]) => {
    const saved = attemptSave(() => reorderPhotos(id, ids));
    if (!saved) setMessage('rollSaveError');
    return saved;
  }, [id, reorderPhotos, setMessage]);
  const changePhoto = useCallback((photoId: string, patch: PhotoDetailsPatch) =>
    attemptSave(() => updatePhoto(id, photoId, patch)), [id, updatePhoto]);

  function requestAddPhotos() {
    if (isPickingPhotos) return;
    if (photoGuideSeen || !photoModuleAvailable) { void handleAddPhotos(); return; }
    setGuideVisible(true);
  }
  function continueFromGuide() {
    // The guide should not block future imports if saving the preference fails.
    try { markPhotoGuideSeen(); } catch { /* Shown again next time. */ }
    setGuideVisible(false);
    // iOS cannot present the picker while this sheet is still dismissing; wait for onDismiss.
    if (Platform.OS === 'ios') pickAfterGuide.current = true;
    else void handleAddPhotos();
  }
  function guideDismissed() {
    if (!pickAfterGuide.current) return;
    pickAfterGuide.current = false;
    void handleAddPhotos();
  }

  async function handleAddPhotos() {
    if (isPickingPhotos) return;
    if (!photoModuleAvailable) { setMessage('photoModuleMissing'); return; }
    setIsPickingPhotos(true); setMessage(null); setAddedCount(null);
    try {
      const result = await PhotoImportService.addToRoll(id);
      if (result.status === 'permission-denied') setMessage('photoPermission');
      if (result.status === 'selected') {
        if (result.addedCount > 0) setAddedCount(result.addedCount);
        if (result.duplicateCount && !result.addedCount && !result.failedCount) setMessage('photosAlreadyAdded');
        if (result.failedCount > 0) setMessage('photoAccessHelp');
      }
    } catch { setMessage('photoImportError'); }
    finally { setIsPickingPhotos(false); }
  }

  const menuActions = {
    onSelect: () => { setViewerVisible(false); selection.enter(); },
    onEdit: () => router.push({ pathname: '/rolls/[id]/edit', params: { id } }),
    onExport: () => { if (roll) setContactSheetRoll(roll); },
    onDelete: () => {
      try { if (deleteRoll(id)) router.replace('/'); }
      catch { Alert.alert(t('deleteRoll'), t('deleteRollError')); }
    },
  };

  return <Screen><Animated.ScrollView scrollEnabled={!dragging} scrollEventThrottle={16}
    onLayout={event => { const height = event.nativeEvent.layout.height; setViewport(value => ({ ...value, height })); }}
    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const top = event.nativeEvent.contentOffset.y;
      setViewport(value => Math.abs(value.top - top) > 80 ? { ...value, top } : value);
      setPinned(top > (reduceMotion ? collapseEnd : collapseStart));
    } })} contentContainerStyle={[styles.container,
    selection.selectionMode && styles.selectionContent,
    selection.selectionMode && { paddingBottom: styles.selectionContent.paddingBottom + insets.bottom,
      paddingTop: styles.container.paddingTop + (Platform.OS === 'android' ? insets.top : 0) }]}>
    <View style={styles.navigation}>
      {selection.selectionMode ? <View style={styles.selectionNavigationSpacer} /> : <>
      <BackButton onPress={handleBack} />
      {roll ? <RollActionsMenu {...menuActions} /> : null}
      </>}
    </View>
    {roll ? <View onLayout={event => setContentY(event.nativeEvent.layout.y)}>
      <View style={styles.filmHeader} onLayout={event => { const { y, height } = event.nativeEvent.layout; setHeaderBottom(y + height); }}>
        {/* The cover opens the film's introduction page. The frame lives on the button so the image cannot grow. */}
        <Pressable disabled={!film || selection.selectionMode} accessibilityRole="button" accessibilityLabel={t('filmInfo')} onPress={() => setFilmInfoVisible(true)}
          style={({ pressed }) => [styles.filmImage, pressed && { opacity: 0.7 }]}>
          <FilmImage film={film} style={styles.fill} />
        </Pressable>
        <Text style={styles.title}>{film ? `${film.brand} ${film.name}` : roll.filmName}</Text>
      </View>
      <View style={styles.specs}>
        <SpecCell label={t('filmDetailIso')} value={film ? String(film.iso) : '—'} />
        <SpecCell label={t('format')} value={roll.format === 'other' ? t('other') : roll.format} />
        <SpecCell label={t('specFrames')} value={roll.frameCount === undefined ? '—' : String(roll.frameCount)} last />
        <SpecCell label={t('camera')} value={roll.cameraName} bottom />
        <SpecCell label={t('created')} value={roll.createdAt ? new Date(roll.createdAt).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} bottom />
        <SpecCell label={t('filmExpiry')} bottom last value={roll.filmExpiry ? formatRollMonth(roll.filmExpiry, language) : '—'}
          status={roll.filmExpiry ? filmExpiryStatus(roll.filmExpiry) : undefined} />
      </View>
      <InfoCard rows={[
        isValidLocation(roll.location) ? { icon: 'mappin.and.ellipse', label: t('location'), text: locationLabel(roll.location), onPress: selection.selectionMode ? undefined : () => setLocationVisible(true) } : null,
        { icon: 'testtube.2', label: t('lab'), text: roll.lab || t('lab'), onPress: selection.selectionMode ? undefined : () => setQuickEditor('lab') },
        { icon: 'text.quote', label: t('notes'), text: roll.notes || t('notes'), onPress: selection.selectionMode ? undefined : () => setQuickEditor('notes') },
      ]} />
      <Text style={styles.photoHeading}>{t('photos')} · {photos.length}</Text>
      {photos.length > 1 && !selection.selectionMode ? <Text style={styles.photoHint}>{t('photoReorderHint')}</Text> : null}
      {message ? <Text style={styles.message}>{t(message)}</Text> : null}
      {message === 'photoAccessHelp' || message === 'photoPermission' ? <Pressable accessibilityRole="button" style={{ paddingVertical: 12 }} onPress={() => {
        void applePhotosProvider.manageAccess().catch(() => Alert.alert(t('photosAccessRequired'), t('photoAccessHelp'))).finally(invalidatePhotoRenders);
      }}><Text style={styles.message}>{t('managePhotosAccess')}</Text></Pressable> : null}
      <ReorderablePhotoGrid viewport={{ top: viewport.top - contentY, height: viewport.height }} adding={isPickingPhotos} onAdd={requestAddPhotos} onDraggingChange={setDragging} onReorder={reorder}
        onPhotoPress={openPhoto} photos={photos} selectionMode={selection.selectionMode} selectedIds={selection.selectedIds}
        onToggleSelection={selection.toggle} onSelectRange={selection.addRange} interactionDisabled={batchBusy} />
    </View> : <View style={styles.notFound}><Text style={styles.title}>{t('rollMissing')}</Text><Text style={styles.description}>{t('rollMissingInfo')}</Text></View>}
  </Animated.ScrollView>
    {roll && !selection.selectionMode ? <Animated.View pointerEvents={pinned ? 'auto' : 'none'} accessibilityElementsHidden={!pinned} importantForAccessibility={pinned ? 'auto' : 'no-hide-descendants'} style={[styles.pinnedBar,
      reduceMotion ? { opacity: pinned ? 1 : 0 } : { opacity: compactOpacity, transform: [{ translateY: compactTranslateY }] }]}>
      <BackButton onPress={handleBack} />
      <View style={styles.pinnedTitle} accessibilityRole="header">
        <Pressable disabled={!film} accessibilityRole="button" accessibilityLabel={t('filmInfo')} onPress={() => setFilmInfoVisible(true)}
          style={({ pressed }) => [styles.pinnedImage, pressed && { opacity: 0.7 }]}>
          <FilmImage film={film} style={styles.fill} />
        </Pressable>
        <Text numberOfLines={1} style={styles.pinnedText}>{film ? `${film.brand} ${film.name}` : roll.filmName}</Text>
      </View>
      <RollActionsMenu {...menuActions} />
    </Animated.View> : null}
    {selection.selectionMode ? <PhotoSelectionControls rollId={id} photos={selection.selectedPhotos}
      allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onExit={selection.exit} onBusyChange={setBatchBusy} /> : null}
    <PhotoImportGuide visible={guideVisible} onContinue={continueFromGuide} onClose={() => setGuideVisible(false)} onDismiss={guideDismissed} />
    {saved ? <Toast key={saved} message={t('changesSaved')} /> : null}
    {addedCount !== null ? <Toast message={t(addedCount === 1 ? 'photoAddedToRoll' : 'photosAddedToRoll', { count: addedCount })} /> : null}
    {filmInfoVisible && film ? <FilmInfoSheet film={film} onClose={() => setFilmInfoVisible(false)} /> : null}
    {contactSheetRoll ? <ContactSheetPreview roll={contactSheetRoll} onClose={() => setContactSheetRoll(null)} /> : null}
    {locationVisible && isValidLocation(roll?.location) ? <LocationPicker mode="view" location={roll.location} onClose={() => setLocationVisible(false)} /> : null}
    {quickEditor && roll ? <RollTextEditor key={quickEditor} title={t(quickEditor)} value={roll[quickEditor] ?? ''} multiline={quickEditor === 'notes'} onClose={() => setQuickEditor(null)} onSave={value => {
      const current = useRollStore.getState().rolls.find(item => item.id === id);
      if (!current) return false;
      const saved = attemptSave(() => useRollStore.getState().updateRoll(id, { ...current, [quickEditor]: value }));
      if (!saved) Alert.alert(t(quickEditor), t('rollSaveError'));
      return saved;
    }} /> : null}
    <PhotoViewerModal rollId={id} visible={viewerVisible && !selection.selectionMode} photos={photos} initialIndex={selectedPhotoIndex} title={roll ? (isValidLocation(roll.location) ? locationLabel(roll.location) : roll.filmName) : ''} subtitle={roll ? formatRollMonth(roll.date, language) : undefined} onPhotoChange={changePhoto} onClose={() => setViewerVisible(false)} />
  </Screen>;
}

/** Runs a store write and reports whether it was saved; the store keeps its previous state on failure. */
function attemptSave(write: () => void): boolean {
  try { write(); return true; }
  catch { return false; }
}

type InfoRow = { icon: SFSymbol; label: string; text: string; muted?: boolean; onPress?: () => void };
/** Place, lab, notes and creation date as one icon list; empty rows are left out. */
function InfoCard({ rows }: { rows: (InfoRow | null)[] }) {
  const styles = useThemedStyles(createRollDetailStyles);
  const colors = useTheme();
  const visible = rows.filter((row): row is InfoRow => row !== null);
  if (!visible.length) return null;
  return <View style={styles.infoCard}>
    {visible.map((row, index) => {
      const content = <>
        <View style={styles.infoIcon}><SymbolView name={row.icon} size={15} tintColor={colors.secondaryText} fallback={null} /></View>
        <Text style={[styles.infoText, row.muted && styles.infoMuted]}>{row.text}</Text>
        {row.onPress ? <SymbolView name="chevron.right" size={12} weight="semibold" tintColor={colors.secondaryText} fallback={<Text style={styles.infoMuted}>›</Text>} /> : null}
      </>;
      const style = [styles.infoRow, index > 0 && styles.infoDivider];
      return row.onPress
        ? <Pressable key={row.icon} accessibilityRole="button" accessibilityLabel={`${row.label}: ${row.text}`} onPress={row.onPress} style={({ pressed }) => [...style, pressed && styles.infoPressed]}>{content}</Pressable>
        : <View key={row.icon} accessible accessibilityLabel={row.label ? `${row.label}: ${row.text}` : row.text} style={style}>{content}</View>;
    })}
  </View>;
}

/** One cell of the 3 × 2 spec card; dividers are drawn on the right and bottom edges only. */
function SpecCell({ label, value, status, last, bottom }: { label: string; value: string; status?: FilmExpiryStatus; last?: boolean; bottom?: boolean }) {
  const styles = useThemedStyles(createRollDetailStyles);
  const { t } = useTranslation();
  return <View accessible accessibilityLabel={`${label}: ${status ? t(status === 'expired' ? 'outDate' : 'inDate') + ', ' : ''}${value}`}
    style={[styles.specCell, !last && styles.specDivider, !bottom && styles.specRow]}>
    <Text numberOfLines={1} style={styles.specLabel}>{label}</Text>
    {status ? <Text style={[styles.badge, status === 'expired' ? styles.badgeExpired : styles.badgeInDate]}>{t(status === 'expired' ? 'outDate' : 'inDate')}</Text> : null}
    <Text numberOfLines={2} style={status ? styles.specSmall : styles.specValue}>{value}</Text>
  </View>;
}
