import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';

import { DatePicker } from '../../../components/ui/DatePicker';
import { useTranslation } from '../../../i18n/useTranslation';
import { LocationPicker } from '../../location/components/LocationPicker';
import { isValidLocation, locationLabel } from '../../location/services/locationService';
import { photoInfoSheetStyles as styles } from '../styles/photo-info-sheet.styles';
import type { PhotoDetailsPatch, PhotoReference } from '../types';
import { formatPhotoDate, todayPhotoDate } from '../utils/photoDate';

type PhotoInfoSheetProps = {
  photo: PhotoReference;
  /** Returns false when the change could not be saved. */
  onChange: (patch: PhotoDetailsPatch) => boolean;
  /** Gesture for the grab handle, so the sheet can be swiped back down. */
  handleGesture: GestureType;
};

export function PhotoInfoSheet({ photo, onChange, handleGesture }: PhotoInfoSheetProps) {
  const { t, language } = useTranslation();
  const [editor, setEditor] = useState<'date' | 'location' | null>(null);
  // Keyed by photo so paging to another photo starts from that photo's saved note.
  const [note, setNote] = useState(photo.note ?? '');
  const [notePhotoId, setNotePhotoId] = useState(photo.id);
  const [saveFailed, setSaveFailed] = useState(false);
  if (notePhotoId !== photo.id) { setNotePhotoId(photo.id); setNote(photo.note ?? ''); setSaveFailed(false); }

  // A failed save keeps the typed note on screen so it can be saved again.
  function save(patch: PhotoDetailsPatch) {
    setSaveFailed(!onChange(patch));
  }

  function saveNote() {
    const next = note.trim() || undefined;
    if (next !== photo.note) save({ note: next });
  }

  return <View style={styles.sheet}>
    <GestureDetector gesture={handleGesture}><View style={styles.handleArea}><View style={styles.handle} /></View></GestureDetector>
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{t('takenAt')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('takenAt')} onPress={() => setEditor('date')} style={({ pressed }) => [styles.valuePill, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={photo.takenAt ? styles.value : styles.placeholderValue}>{photo.takenAt ? formatPhotoDate(photo.takenAt, language) : t('tapToSet')}</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>{t('location')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('location')} onPress={() => setEditor('location')} style={({ pressed }) => [styles.valuePill, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={isValidLocation(photo.location) ? styles.value : styles.placeholderValue}>{isValidLocation(photo.location) ? locationLabel(photo.location) : t('tapToSet')}</Text>
        </Pressable>
      </View>
      <View style={styles.divider} />
      <Text style={styles.noteLabel}>{t('notes')}</Text>
      <TextInput
        multiline
        value={note}
        onChangeText={setNote}
        onBlur={saveNote}
        placeholder={t('photoNotePlaceholder')}
        placeholderTextColor="#636366"
        keyboardAppearance="dark"
        style={styles.noteInput}
      />
      {saveFailed ? <Text accessibilityRole="alert" style={styles.error}>{t('rollSaveError')}</Text> : null}
    </View>
    <DatePicker visible={editor === 'date'} value={photo.takenAt ?? todayPhotoDate()} onCancel={() => setEditor(null)} onConfirm={(takenAt) => { save({ takenAt }); setEditor(null); }} />
    {editor === 'location' ? <LocationPicker mode="select" location={photo.location} onClose={() => setEditor(null)} onConfirm={(location) => { save({ location }); setEditor(null); }} /> : null}
  </View>;
}
