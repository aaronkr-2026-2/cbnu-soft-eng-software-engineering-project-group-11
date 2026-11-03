import { useContactSheetPreferences } from '../store/contactSheetPreferences';
import { contactSheetPalette, normalizeContactSheetHex, type ContactSheetAppearance } from '../utils/contactSheetAppearance';
import { ContactSheetAppearanceControls } from './ContactSheetAppearanceControls';
import { resolvePhoto } from '../../photos/services/PhotoReferenceService';
import { effectiveFilmName } from '../../films/utils/resolveRollFilm';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, PixelRatio, Platform, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { BackButton } from '../../../components/ui/BackButton';
import { Toast } from '../../../components/ui/Toast';
import { useTheme, useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import type { TranslationKey } from '../../../i18n/translations';
import { useResolvedPhotos } from '../../photos/hooks/useResolvedPhotos';
import type { Roll } from '../../rolls/types';
import { formatRollMonth } from '../../rolls/utils/rollMonth';
import { isRollMonth } from '../../rolls/utils/groupRolls';
import { captureContactSheet, ContactSheetExportError, createContactSheetExportSession } from '../services/ContactSheetExportService';
import { createContactSheetStyles } from '../styles/contact-sheet.styles';
import { contactSheetRows, getContactSheetLayout, orderedContactPhotos } from '../utils/contactSheetLayout';
import { type ContactSheetFrame, ContactSheetCanvas } from './ContactSheetCanvas';

type Props = { roll: Roll; onClose: () => void };
type PendingRender = { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> };

export function ContactSheetPreview({ roll, onClose }: Props) {
  const { t, language } = useTranslation();
  const colors = useTheme();
  const styles = useThemedStyles(createContactSheetStyles);
  const appearance = useContactSheetPreferences(state => state.appearance);
  const updateAppearance = useContactSheetPreferences(state => state.updateAppearance);
  const [showAppearance, setShowAppearance] = useState(false);
  const [hexValue, setHexValue] = useState(appearance.customColor);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [renderExport, setRenderExport] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [saved, setSaved] = useState(0);
  const exportView = useRef<View>(null);
  const mounted = useRef(true);
  const pending = useRef<PendingRender | null>(null);
  const photos = useMemo(() => orderedContactPhotos(roll), [roll]);
  const layout = useMemo(() => getContactSheetLayout(roll.format, photos.length, appearance.frameStyle), [roll.format, photos.length, appearance.frameStyle]);
  const resolved = useResolvedPhotos(photos);
  const rows = useMemo(() => contactSheetRows(photos.map((photo, index) => ({ id: photo.id, uri: resolved.items[index]?.uri, number: index + 1 })), layout.columns), [photos, layout.columns, resolved.items]);
  const [exportAppearance, setExportAppearance] = useState(appearance);
  const [exportRows, setExportRows] = useState<ContactSheetFrame[][]>([]);
  const header = {
    left: isRollMonth(roll.date) ? formatRollMonth(roll.date, language) : '',
    center: roll.cameraName || '',
    right: [roll.format === 'other' ? t('other') : roll.format, effectiveFilmName(roll)].filter(Boolean).join(' · '),
  };

  const session = useRef<ReturnType<typeof createContactSheetExportSession> | null>(null);
  const generate = useCallback(async () => {
    try {
      const images = [];
      for (const [index, photo] of photos.entries()) {
        const result = await resolvePhoto(photo, 'thumbnail', 1200);
        if (result.status !== 'ready' || !result.uri) throw new Error('Contact sheet photo unavailable');
        images.push({ id: photo.id, uri: result.uri, number: index + 1 });
      }
      setExportAppearance(appearance);
      setExportRows(contactSheetRows(images, layout.columns));
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { pending.current = null; reject(new Error('Contact sheet images timed out')); }, 30000);
        pending.current = { resolve, reject, timeout };
        setRenderExport(true);
      });
      if (!exportView.current) throw new Error('Contact sheet canvas is missing');
      return await captureContactSheet(exportView.current, layout);
    } finally {
      if (mounted.current) setRenderExport(false);
    }
  }, [layout, photos, appearance]);

  const ready = useCallback(() => {
    if (!pending.current) return;
    const render = pending.current; pending.current = null;
    clearTimeout(render.timeout); render.resolve();
  }, []);
  const failed = useCallback(() => {
    if (!pending.current) return;
    const render = pending.current; pending.current = null;
    clearTimeout(render.timeout); render.reject(new Error('Contact sheet photo is unavailable'));
  }, []);

  useEffect(() => {
    mounted.current = true;
    const exportSession = createContactSheetExportSession(generate, async () => {
      for (const photo of photos) {
        const result = await resolvePhoto(photo, 'thumbnail', 1200);
        if (result.status !== 'ready' || !result.uri) throw new Error('Contact sheet photo unavailable');
      }
    });
    session.current = exportSession;
    return () => {
      mounted.current = false;
      if (pending.current) { clearTimeout(pending.current.timeout); pending.current.reject(new Error('Preview closed')); pending.current = null; }
      exportSession.dispose();
      if (session.current === exportSession) session.current = null;
    };
  }, [generate, photos]);

  async function perform(action: 'save' | 'share') {
    if (busyRef.current) return;
    Keyboard.dismiss();
    busyRef.current = true; setBusy(true); setError(null);
    try {
      if (!session.current) throw new Error('Contact sheet session is not ready');
      await session.current[action]();
      if (mounted.current && action === 'save') setSaved(value => value + 1);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof ContactSheetExportError
        ? cause.reason === 'permission' ? 'contactSheetPermission' : 'contactSheetSharingUnavailable'
        : 'contactSheetError');
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function changeAppearance(patch: Partial<ContactSheetAppearance>) {
    if (busyRef.current) return;
    try { updateAppearance(patch); setError(null); }
    catch { setError('csPreferenceError'); }
  }
  function changeHex(value: string) {
    setHexValue(value);
    const color = normalizeContactSheetHex(value);
    if (color) changeAppearance({ background: 'custom', customColor: color });
  }
  const invalidHex = appearance.background === 'custom' && !normalizeContactSheetHex(hexValue);
  const previewWidth = Math.max(0, Math.min(stage.width, stage.height * layout.width / layout.height));
  const disabled = busy || photos.length === 0 || Boolean(invalidHex);
  return <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => { if (!busyRef.current) onClose(); }}>
    <SafeAreaView style={styles.root}><KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.toolbar}>
        <BackButton onPress={() => { if (!busyRef.current) onClose(); }} accessibilityLabel={t('closeContactSheet')} />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{t('contactSheet')}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAppearance, disabled: busy }} disabled={busy} onPress={() => setShowAppearance(value => !value)} style={styles.customizeButton}><Text style={styles.optionText}>{t('csCustomize')}</Text></Pressable>
      </View>
      <View style={[styles.stage, { backgroundColor: contactSheetPalette(appearance).background }]} onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setStage(previous => previous.width === width && previous.height === height ? previous : { width, height });
      }}>
        {previewWidth > 0 ? <ContactSheetCanvas appearance={appearance} layout={layout} rows={rows} header={header} width={previewWidth} unavailableLabel={t('unavailable')} /> : null}
      </View>
      {showAppearance && <ScrollView style={styles.appearanceScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        <ContactSheetAppearanceControls appearance={appearance} disabled={busy} hexValue={hexValue} onHexChange={changeHex} onChange={changeAppearance} />
      </ScrollView>}
      {!showAppearance && invalidHex ? <Text accessibilityRole="alert" style={styles.error}>{t('csHexInvalid')}</Text> : null}
      {photos.length === 0 ? <Text style={styles.statusText}>{t('noPhotos')}</Text> : null}
      {busy ? <View style={styles.status}><ActivityIndicator color={colors.secondaryText} /><Text accessibilityLiveRegion="polite" style={styles.statusText}>{t('generatingContactSheet')}</Text></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={[styles.button, disabled && styles.disabled]} onPress={() => void perform('save')}>
          <Text style={styles.buttonText}>{t('saveImage')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} style={[styles.button, styles.secondary, disabled && styles.disabled]} onPress={() => void perform('share')}>
          <Text style={[styles.buttonText, styles.secondaryText]}>{t('share')}</Text>
        </Pressable>
      </View>
      {saved > 0 ? <Toast key={saved} message={t('contactSheetSaved')} /> : null}
      {renderExport ? <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.exportLayer}>
        <ContactSheetCanvas appearance={exportAppearance} canvasRef={exportView} layout={layout} rows={exportRows} header={header}
          width={layout.width / PixelRatio.get()} unavailableLabel={t('unavailable')} onReady={ready} onFailure={failed} />
      </View> : null}
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
