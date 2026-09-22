import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SelectionChip } from '../../../components/ui/SelectionChip';
import { colors, radii, spacing, typography } from '../../../constants/theme';
import { useFilmStore } from '../store/filmStore';

type CustomFilmModalProps = { onAdded: (filmId: string) => void; onClose: () => void; visible: boolean };

export function CustomFilmModal({ onAdded, onClose, visible }: CustomFilmModalProps) {
  const addCustomFilm = useFilmStore((state) => state.addCustomFilm);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [iso, setIso] = useState('');
  const [format, setFormat] = useState<'35mm' | '120' | '110'>('35mm');
  const [type, setType] = useState<'color' | 'black-and-white' | 'slide'>('color');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function chooseImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photos access needed', 'Allow Photos access to choose a film package image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) setImageUri(result.assets[0]?.uri);
  }

  function addFilm() {
    const parsedIso = Number(iso);
    if (!brand.trim() || !name.trim() || !Number.isFinite(parsedIso) || parsedIso <= 0) { setError('Enter a brand, film name, and positive ISO.'); return; }
    const film = addCustomFilm({ brand: brand.trim(), name: name.trim(), iso: parsedIso, format, type, imageUri });
    onAdded(film.id); onClose();
  }

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={styles.backdrop}><View style={styles.sheet}><ScrollView showsVerticalScrollIndicator={false}>
    <Text style={styles.title}>Add custom film</Text><Field label="Brand *" value={brand} onChangeText={setBrand} placeholder="Kodak" /><Field label="Film name *" value={name} onChangeText={setName} placeholder="Portra 160" /><Field label="ISO *" value={iso} onChangeText={setIso} placeholder="160" keyboardType="number-pad" />
    <Text style={styles.label}>Format *</Text><View style={styles.chips}>{(['35mm', '120', '110'] as const).map((item) => <SelectionChip key={item} label={item} onPress={() => setFormat(item)} selected={format === item} />)}</View>
    <Text style={styles.label}>Type *</Text><View style={styles.chips}>{([['color', 'Color'], ['black-and-white', 'B&W'], ['slide', 'Slide']] as const).map(([value, label]) => <SelectionChip key={value} label={label} onPress={() => setType(value)} selected={type === value} />)}</View>
    <Text style={styles.label}>Film image (optional)</Text><Pressable onPress={chooseImage} style={styles.imageButton}>{imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <Text style={styles.imageText}>+ Choose image</Text>}</Pressable>
    {error ? <Text style={styles.error}>{error}</Text> : null}<View style={styles.actions}><Pressable onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><View style={styles.add}><PrimaryButton label="Add Film" onPress={addFilm} /></View></View>
  </ScrollView></View></View></Modal>;
}

function Field({ label, ...inputProps }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'number-pad' }) {
  return <><Text style={styles.label}>{label}</Text><TextInput {...inputProps} placeholderTextColor={colors.secondaryText} style={styles.input} /></>;
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.28)', flex: 1, justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: spacing.lg }, title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold }, label: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.semibold, marginTop: spacing.md, marginBottom: spacing.sm }, input: { borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, color: colors.text, fontSize: typography.size.body, padding: 12 }, chips: { flexDirection: 'row', gap: spacing.sm }, imageButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, height: 96, justifyContent: 'center', overflow: 'hidden' }, image: { height: '100%', width: '100%' }, imageText: { color: colors.secondaryText, fontSize: typography.size.body }, error: { color: colors.text, fontSize: typography.size.small, marginTop: spacing.sm }, actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }, cancel: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', paddingHorizontal: spacing.lg }, cancelText: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold }, add: { flex: 1 },
});
