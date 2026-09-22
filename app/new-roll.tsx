import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { IconButton } from '../src/components/ui/IconButton';
import { MonthYearField } from '../src/components/ui/MonthYearField';
import { MonthYearPicker } from '../src/components/ui/MonthYearPicker';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { SelectionChip } from '../src/components/ui/SelectionChip';
import { colors, radii, spacing, typography } from '../src/constants/theme';
import { CameraCard } from '../src/features/cameras/components/CameraCard';
import { cameras } from '../src/features/cameras/data/cameras';
import { FilmCard } from '../src/features/films/components/FilmCard';
import { CustomFilmModal } from '../src/features/films/components/CustomFilmModal';
import { useFilmStore } from '../src/features/films/store/filmStore';
import { useRollStore } from '../src/features/rolls/store/rollStore';
import type { RollFormat } from '../src/features/rolls/types';
import { formatRollMonth } from '../src/features/rolls/utils/rollMonth';

const formats: RollFormat[] = ['35mm', '120', '110'];
const frameCounts = [24, 27, 36, 'Other'] as const;

export default function NewRoll() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cameraId?: string; filmId?: string }>();
  const createRoll = useRollStore((state) => state.createRoll);
  const films = useFilmStore((state) => state.films);
  const [filmId, setFilmId] = useState(params.filmId ?? films[0].id);
  const [cameraId, setCameraId] = useState(params.cameraId ?? cameras[0].id);
  const [format, setFormat] = useState<RollFormat>('35mm');
  const [frameCount, setFrameCount] = useState<(typeof frameCounts)[number]>(36);
  const [date, setDate] = useState(currentRollMonth());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [customFilmVisible, setCustomFilmVisible] = useState(false);

  const selectedFilm = films.find((film) => film.id === filmId);
  const selectedCamera = cameras.find((camera) => camera.id === cameraId);

  function handleCreateRoll() {
    if (!selectedFilm || !selectedCamera || !format || !frameCount || !date) {
      setError('Choose a film, camera, format, frame count, and month.');
      return;
    }

    const roll = createRoll({
      cameraId: selectedCamera.id,
      cameraName: selectedCamera.brand + ' ' + selectedCamera.model,
      date,
      filmId: selectedFilm.id,
      filmName: selectedFilm.brand + ' ' + selectedFilm.name,
      format,
      frameCount: frameCount === 'Other' ? 0 : frameCount,
      notes: notes.trim() || undefined,
    });
    router.replace({ pathname: '/rolls/[id]', params: { id: roll.id } });
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton accessibilityLabel="Go back" circular icon="‹" onPress={() => router.back()} />
          <IconButton accessibilityLabel="Open settings" circular icon="⚙" onPress={() => router.push('/settings')} />
        </View>

        <Text style={styles.title}>New Roll</Text>
        <Text style={styles.description}>Start an archive entry for a new roll of film.</Text>

        <SectionHeader label="Film" onPress={() => router.push('/films')} />
        <ScrollView contentContainerStyle={styles.catalogList} horizontal showsHorizontalScrollIndicator={false}>
          {films.map((film) => <FilmCard film={film} key={film.id} onPress={() => setFilmId(film.id)} selected={film.id === filmId} />)}
        </ScrollView>
        <CustomCatalogButton label="Add custom film" onPress={() => setCustomFilmVisible(true)} />

        <SectionHeader label="Camera" onPress={() => router.push('/cameras')} />
        <ScrollView contentContainerStyle={styles.catalogList} horizontal showsHorizontalScrollIndicator={false}>
          {cameras.map((camera) => <CameraCard camera={camera} key={camera.id} onPress={() => setCameraId(camera.id)} selected={camera.id === cameraId} />)}
        </ScrollView>
        <CustomCatalogButton label="Add custom camera" onPress={() => Alert.alert('Custom camera', 'Custom camera entry will be available in a later milestone.')} />

        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailRow}>
          <View style={styles.detailColumn}><Text style={styles.fieldLabel}>Format</Text><View style={styles.chips}>{formats.map((item) => <SelectionChip key={item} label={item} onPress={() => setFormat(item)} selected={format === item} />)}</View></View>
          <View style={styles.detailColumn}><Text style={styles.fieldLabel}>Frame count</Text><View style={styles.chips}>{frameCounts.map((item) => <SelectionChip key={item} label={String(item)} onPress={() => setFrameCount(item)} selected={frameCount === item} />)}</View></View>
        </View>

        <Text style={styles.fieldLabel}>Date</Text>
        <MonthYearField label={formatRollMonth(date)} onPress={() => setDateModalVisible(true)} />
        <Text style={styles.fieldLabel}>Notes (optional)</Text>
        <TextInput multiline onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={colors.secondaryText} style={styles.notes} textAlignVertical="top" value={notes} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.createButton}><PrimaryButton label="Create Roll" onPress={handleCreateRoll} /></View>
      </ScrollView>

      <CustomFilmModal onAdded={(id) => setFilmId(id)} onClose={() => setCustomFilmVisible(false)} visible={customFilmVisible} />
      <MonthYearPicker onCancel={() => setDateModalVisible(false)} onConfirm={(value) => { setDate(value); setDateModalVisible(false); }} value={date} visible={dateModalVisible} />
    </Screen>
  );
}

function SectionHeader({ label, onPress }: { label: string; onPress: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{label}</Text><Pressable accessibilityRole="button" onPress={onPress}><Text style={styles.seeAll}>See all ›</Text></Pressable></View>;
}

function CustomCatalogButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.custom}><Text style={styles.customTitle}>+  {label}</Text><Text style={styles.customText}>Can&apos;t find your {label.includes('film') ? 'film' : 'camera'}? Add it manually.</Text></Pressable>;
}

function currentRollMonth() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

const styles = StyleSheet.create({
  content: { padding: spacing.screen, paddingTop: spacing.md, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold, marginTop: spacing.lg },
  description: { color: colors.secondaryText, fontSize: typography.size.label, lineHeight: 23, marginTop: spacing.xs },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 34, marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
  seeAll: { color: colors.secondaryText, fontSize: typography.size.small, fontWeight: typography.weight.medium },
  catalogList: { gap: 12, paddingRight: spacing.screen },
  custom: { borderColor: colors.border, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, marginTop: spacing.md, padding: spacing.md },
  customTitle: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold },
  customText: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xs },
  detailRow: { flexDirection: 'row', gap: spacing.lg },
  detailColumn: { flex: 1 },
  fieldLabel: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.semibold, marginBottom: spacing.sm, marginTop: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  notes: { borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, color: colors.text, fontSize: typography.size.body, height: 94, padding: 12 },
  error: { color: colors.text, fontSize: typography.size.small, marginTop: spacing.sm },
  createButton: { marginTop: spacing.xl },
});
