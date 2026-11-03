import { usePreventRemove } from 'expo-router/react-navigation';
import { isRollDraftDirty, isValidRollDraft } from '../utils/rollDraft';
import { FilmImage } from '../../films/components/FilmImage';
import { resolveRollFilm } from '../../films/utils/resolveRollFilm';
import { FilmForm } from '../../films/components/FilmForm';
import { LocationPicker } from '../../location/components/LocationPicker';
import { locationLabel } from '../../location/services/locationService';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { BackButton } from '../../../components/ui/BackButton';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { MonthYearPicker } from '../../../components/ui/MonthYearPicker';
import { SymbolView } from 'expo-symbols';
import { useTheme, useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { useFilmStore } from '../../films/store/filmStore';
import { useCameraStore } from '../../cameras/store/cameraStore';
import { useNewRollDraftStore } from '../store/newRollDraftStore';
import { useRollStore } from '../store/rollStore';
import { createRollFormStyles } from '../styles/roll-form.styles';
import { SettingsSelectModal } from '../../settings/components/SettingsSelectModal';
import { RollTextEditor } from './RollTextEditor';
import { filmExpiryStatus, formatRollMonth, toRollMonth } from '../utils/rollMonth';

export function RollInformationScreen({ editingId }: { editingId?: string }) {
  const styles = useThemedStyles(createRollFormStyles);
  const { t, language } = useTranslation();
  const router = useRouter();
  const draftState = useNewRollDraftStore();
  const draft = (editingId ? draftState.editDraft : draftState.draft) ?? draftState.draft;
  const update = editingId ? draftState.updateEdit : draftState.update;
  const reset = draftState.reset;
  const original = useRollStore((state) => state.rolls.find((roll) => roll.id === editingId));
  const updateRoll = useRollStore((state) => state.updateRoll);
  const film = useFilmStore((state) => resolveRollFilm(state.films, draft));
  const camera = useCameraStore((state) => state.cameras.find((item) => item.id === draft.cameraId) ?? (editingId ? undefined : state.cameras[0]));
  const createRoll = useRollStore((state) => state.createRoll);
  const [editor, setEditor] = useState<'film' | 'frameCount' | 'format' | 'date' | 'filmExpiry' | 'lab' | 'location' | 'notes' | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState<'save' | 'cancel' | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const dirty = !!original && isRollDraftDirty(draft, original);
  function requestDiscard() {
    if (!dirty) { setLeaving('cancel'); return; }
    Alert.alert(t('discardChanges'), undefined, [
      { text: t('keepEditing'), style: 'cancel' },
      { text: t('discard'), style: 'destructive', onPress: () => setLeaving('cancel') },
    ]);
  }
  usePreventRemove(!!editingId && dirty && !leaving, requestDiscard);
  useEffect(() => {
    if (editingId && leaving) router.dismissTo({ pathname: '/rolls/[id]', params: { id: editingId, ...(leaving === 'save' ? { saved: String(Date.now()) } : {}) } });
  }, [leaving, editingId, router]);
  const filmName = film ? `${film.brand} ${film.name}` : original?.filmName;
  const cameraName = camera ? `${camera.brand} ${camera.model}` : original?.cameraName;
  function closeEditor() {
    if (editingId) { requestDiscard(); return; }
    if (router.canGoBack()) router.back();
    else router.replace('/new-roll');
  }
  if (!filmName) return creating ? null : <Redirect href="/new-roll" />;
  function submit() {
    if (creating) return;
    if (!draft.filmId || !(camera?.id ?? original?.cameraId) || !filmName || !cameraName || !isValidRollDraft(draft)) { setError(true); return; }
    setCreating(true); setSaveFailed(false);
    try {
    const now = new Date();
    const input = { ...draft, date: editingId ? draft.date : toRollMonth(now.getFullYear(), now.getMonth() + 1), filmId: draft.filmId, filmName, cameraId: camera?.id ?? original!.cameraId, cameraName, lab: draft.lab.trim() || undefined, notes: draft.notes.trim() || undefined };
    if (editingId) {
      updateRoll(editingId, input);
      setLeaving('save');
      return;
    }
    const roll = createRoll(input);
    router.dismissAll();
    router.push({ pathname: '/rolls/[id]', params: { id: roll.id } });
    reset();
    } catch { setCreating(false); setSaveFailed(true); }
  }
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    {editingId ? <Pressable accessibilityRole="button" onPress={closeEditor}><Text style={styles.label}>{t('cancel')}</Text></Pressable> : <BackButton onPress={closeEditor} />}
    <Text style={styles.title}>{t(editingId ? 'editRoll' : 'rollInfo')}</Text>
    <View style={styles.film}>
      <Pressable disabled={!film} accessibilityRole="button" accessibilityLabel={t('editFilm')} onPress={() => setEditor('film')} style={({ pressed }) => [styles.filmEdit, pressed && { opacity: 0.7 }]}>
      <FilmImage film={film} style={styles.image} placeholderStyle={styles.secondary} />
      <View style={styles.filmText}><Text style={styles.name}>{filmName}</Text>{film ? <Text style={styles.secondary}>ISO {film.iso} · {t(film.type)}</Text> : null}</View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/films', params: { change: '1', ...(editingId ? { edit: editingId } : {}) } })}><Text style={styles.label}>{t('change')} ›</Text></Pressable>
    </View>
    <Text style={styles.heading}>{t('basicInfo')}</Text><View style={styles.group}>
      <Row label={t('camera')} value={cameraName ?? '—'} onPress={() => router.push({ pathname: '/cameras', params: editingId ? { edit: editingId } : { select: '1' } })} />
      <Row label={t('format')} value={draft.format === '120' || draft.format === '110' ? `${draft.format}mm` : draft.format} onPress={() => setEditor('format')} />
      <Row label={t('frameCount')} value={draft.frameCount === undefined ? '—' : String(draft.frameCount)} onPress={() => setEditor('frameCount')} />
    </View>
    <Text style={styles.heading}>{t('rollSection')}</Text><View style={styles.group}>
      {editingId ? <Row label={t('shotIn')} value={formatRollMonth(draft.date, language)} onPress={() => setEditor('date')} /> : null}
      <Row label={t('filmExpiry')} value={draft.filmExpiry ? `${formatRollMonth(draft.filmExpiry, language)} · ${t(filmExpiryStatus(draft.filmExpiry) === 'expired' ? 'outDate' : 'inDate')}` : '—'} onPress={() => setEditor('filmExpiry')}
        onClear={draft.filmExpiry ? () => update({ filmExpiry: undefined }) : undefined} clearLabel={t('removeExpiry')} />
      <Row label={t('lab')} value={draft.lab || '—'} onPress={() => setEditor('lab')} />
      <Row label={t('location')} value={draft.location ? locationLabel(draft.location) : '—'} onPress={() => setEditor('location')}
        onClear={draft.location ? () => update({ location: undefined }) : undefined} clearLabel={t('removeLocation')} />
      <Row label={t('notes')} value={draft.notes || '—'} onPress={() => setEditor('notes')} />
    </View>
    {saveFailed ? <Text accessibilityRole="alert" style={styles.error}>{t('rollSaveError')}</Text> : null}
    {error ? <Text style={styles.error}>{t('invalidRoll')}</Text> : null}
    <View style={styles.action}><PrimaryButton disabled={creating || (!!editingId && !dirty)} label={t(editingId ? 'saveChanges' : 'createRoll')} onPress={submit} /></View>
  </ScrollView>
    {editor === 'film' && film ? <FilmForm mode="edit" initialValues={film} visible onClose={() => setEditor(null)} onSubmit={filmOverride => update({ filmOverride })} /> : null}
    {editor === 'frameCount' ? <SettingsSelectModal title={t('frameCount')} options={['12', '24', '36'].map(value => ({ value, label: `${value} exp` }))} value={String(draft.frameCount ?? '')} onClose={() => setEditor(null)} onSelect={value => { update({ frameCount: Number(value) }); setEditor(null); }} /> : null}
    {editor === 'format' ? <SettingsSelectModal title={t('format')} options={(['35mm', '120', '110'] as const).map((value) => ({ value, label: value === '35mm' ? value : `${value}mm` }))} value={draft.format} onClose={() => setEditor(null)} onSelect={(format) => { update({ format }); setEditor(null); }} /> : null}
    {editor === 'lab' || editor === 'notes' ? <RollTextEditor key={editor} title={t(editor)} value={draft[editor]} multiline={editor === 'notes'} onClose={() => setEditor(null)} onSave={(value) => update({ [editor]: value })} /> : null}
    {editor === 'location' ? <LocationPicker mode="select" location={draft.location} onClose={() => setEditor(null)} onConfirm={(location) => { update({ location }); setEditor(null); }} /> : null}
    <MonthYearPicker visible={editor === 'date'} value={draft.date} onCancel={() => setEditor(null)} onConfirm={(date) => { update({ date }); setEditor(null); }} />
    {/* Expiry starts from the shooting month when empty; most boxes are dated a year or two ahead. */}
    <MonthYearPicker visible={editor === 'filmExpiry'} value={draft.filmExpiry ?? draft.date.slice(0, 7)} onCancel={() => setEditor(null)} onConfirm={(filmExpiry) => { update({ filmExpiry }); setEditor(null); }} />
  </Screen>;
}
/** A settings-style row; optional values show an inline clear button in place of the chevron. */
function Row({ label, value, onPress, onClear, clearLabel }: { label: string; value: string; onPress: () => void; onClear?: () => void; clearLabel?: string }) {
  const styles = useThemedStyles(createRollFormStyles);
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={{ text: value }} onPress={onPress} style={styles.row}>
    <Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={styles.value}>{value}</Text>
    {onClear ? <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} hitSlop={10} onPress={onClear} style={styles.clear}>
      <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.secondaryText} fallback={<Text style={styles.secondary}>✕</Text>} />
    </Pressable> : <Text style={styles.secondary}>›</Text>}
  </Pressable>;
}
