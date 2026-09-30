import { LocationPicker } from '../../location/components/LocationPicker';
import { locationLabel } from '../../location/services/locationService';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { IconButton } from '../../../components/ui/IconButton';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { MonthYearPicker } from '../../../components/ui/MonthYearPicker';
import { useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { useFilmStore } from '../../films/store/filmStore';
import { useCameraStore } from '../../cameras/store/cameraStore';
import { useNewRollDraftStore } from '../store/newRollDraftStore';
import { useRollStore } from '../store/rollStore';
import { createRollFormStyles } from '../styles/roll-form.styles';
import { SettingsSelectModal } from '../../settings/components/SettingsSelectModal';
import { RollTextEditor } from './RollTextEditor';
import { formatRollMonth } from '../utils/rollMonth';

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
  const film = useFilmStore((state) => state.films.find((item) => item.id === draft.filmId));
  const camera = useCameraStore((state) => state.cameras.find((item) => item.id === draft.cameraId) ?? (editingId ? undefined : state.cameras[0]));
  const createRoll = useRollStore((state) => state.createRoll);
  const [editor, setEditor] = useState<'format' | 'date' | 'lab' | 'location' | 'notes' | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const filmName = film ? `${film.brand} ${film.name}` : original?.filmName;
  const cameraName = camera ? `${camera.brand} ${camera.model}` : original?.cameraName;
  function closeEditor() {
    if (router.canGoBack()) router.back();
    else if (editingId) router.replace({ pathname: '/rolls/[id]', params: { id: editingId } });
    else router.replace('/new-roll');
  }
  if (!filmName) return creating ? null : <Redirect href="/new-roll" />;
  function submit() {
    if (creating) return;
    if (!draft.filmId || !(camera?.id ?? original?.cameraId) || !filmName || !cameraName || !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.date)) { setError(true); return; }
    setCreating(true);
    const input = { ...draft, filmId: draft.filmId, filmName, cameraId: camera?.id ?? original!.cameraId, cameraName, lab: draft.lab.trim() || undefined, notes: draft.notes.trim() || undefined };
    if (editingId) {
      updateRoll(editingId, input);
      closeEditor();
      return;
    }
    const roll = createRoll(input);
    router.dismissAll();
    router.push({ pathname: '/rolls/[id]', params: { id: roll.id } });
    reset();
  }
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    {editingId ? <Pressable accessibilityRole="button" onPress={closeEditor} style={styles.cancel}><Text style={styles.label}>{t('cancel')}</Text></Pressable> : <IconButton accessibilityLabel={t('back')} icon="‹" circular onPress={closeEditor} />}
    <Text style={styles.title}>{t(editingId ? 'editRoll' : 'rollInfo')}</Text>
    <View style={styles.film}>
      {film?.imageUri || film?.imageUrl ? <Image source={{ uri: film.imageUri ?? film.imageUrl }} resizeMode="contain" style={styles.image} /> : <View style={styles.image}><Text style={styles.secondary}>{t('film')}</Text></View>}
      <View style={styles.filmText}><Text style={styles.name}>{filmName}</Text>{film ? <Text style={styles.secondary}>ISO {film.iso} · {t(film.type)}</Text> : null}</View>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/films', params: { change: '1', ...(editingId ? { edit: editingId } : {}) } })}><Text style={styles.label}>{t('change')} ›</Text></Pressable>
    </View>
    <Text style={styles.heading}>{t('basicInfo')}</Text><View style={styles.group}>
      <Row label={t('camera')} value={cameraName ?? '—'} onPress={() => router.push({ pathname: '/cameras', params: editingId ? { edit: editingId } : { select: '1' } })} />
      <Row label={t('format')} value={draft.format} onPress={() => setEditor('format')} />
    </View>
    <Text style={styles.heading}>{t('rollSection')}</Text><View style={styles.group}>
      <Row label={t('date')} value={formatRollMonth(draft.date, language)} onPress={() => setEditor('date')} />
      <Row label={t('lab')} value={draft.lab || '—'} onPress={() => setEditor('lab')} />
      <Row label={t('location')} value={draft.location ? locationLabel(draft.location) : '—'} onPress={() => setEditor('location')} />
      <Row label={t('notes')} value={draft.notes || '—'} onPress={() => setEditor('notes')} />
    </View>
    {draft.location ? <Pressable accessibilityRole="button" style={styles.cancel} onPress={() => update({ location: undefined })}><Text style={styles.secondary}>{t('removeLocation')}</Text></Pressable> : null}
    {error ? <Text style={styles.error}>{t('invalidRoll')}</Text> : null}
    <View style={styles.action}><PrimaryButton disabled={creating} label={t(editingId ? 'saveChanges' : 'createRoll')} onPress={submit} /></View>
  </ScrollView>
    {editor === 'format' ? <SettingsSelectModal title={t('format')} options={(['35mm', '120', '110'] as const).map((value) => ({ value, label: value }))} value={draft.format} onClose={() => setEditor(null)} onSelect={(format) => { update({ format }); setEditor(null); }} /> : null}
    {editor === 'lab' || editor === 'notes' ? <RollTextEditor key={editor} title={t(editor)} value={draft[editor]} multiline={editor === 'notes'} onClose={() => setEditor(null)} onSave={(value) => update({ [editor]: value })} /> : null}
    {editor === 'location' ? <LocationPicker mode="select" location={draft.location} onClose={() => setEditor(null)} onConfirm={(location) => { update({ location }); setEditor(null); }} /> : null}
    <MonthYearPicker visible={editor === 'date'} value={draft.date} onCancel={() => setEditor(null)} onConfirm={(date) => { update({ date }); setEditor(null); }} />
  </Screen>;
}
function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const styles = useThemedStyles(createRollFormStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={{ text: value }} onPress={onPress} style={styles.row}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} style={styles.value}>{value}</Text><Text style={styles.secondary}>›</Text></Pressable>;
}
