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
  onChange: (patch: PhotoDetailsPatch) => void;
  /** Gesture for the grab handle, so the sheet can be swiped back down. */
  handleGesture: GestureType;
};

export function PhotoInfoSheet({ photo, onChange, handleGesture }: PhotoInfoSheetProps) {
  const { t, language } = useTranslation();
  const [editor, setEditor] = useState<'date' | 'location' | null>(null);
  // Keyed by photo so paging to another photo starts from that photo's saved note.
  const [note, setNote] = useState(photo.note ?? '');
  const [notePhotoId, setNotePhotoId] = useState(photo.id);
  if (notePhotoId !== photo.id) { setNotePhotoId(photo.id); setNote(photo.note ?? ''); }

  function saveNote() {
    const next = note.trim() || undefined;
    if (next !== photo.note) onChange({ note: next });
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
    </View>
    <DatePicker visible={editor === 'date'} value={photo.takenAt ?? todayPhotoDate()} onCancel={() => setEditor(null)} onConfirm={(takenAt) => { onChange({ takenAt }); setEditor(null); }} />
    {editor === 'location' ? <LocationPicker mode="select" location={photo.location} onClose={() => setEditor(null)} onConfirm={(location) => { onChange({ location }); setEditor(null); }} /> : null}
  </View>;
}
