import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../../../i18n/useTranslation';
import type { TranslationKey } from '../../../i18n/translations';
import type { Film } from '../../../types/models';
import { filmPageColor } from '../services/FilmColorService';
import { fallbackFilmPageColor } from '../utils/filmPageColor';
import { FilmImage } from './FilmImage';

const statusLabels: Record<NonNullable<Film['status']>, TranslationKey> = {
  current: 'filmStatusCurrent', discontinued: 'filmStatusDiscontinued', specialty: 'filmStatusSpecialty',
};
// Stacked bands stand in for a gradient: the cover fades into the page color over its lower part.
const fadeSteps = Array.from({ length: 24 }, (_, index) => (index + 1) / 24);

/** Film introduction page: full-width cover fading into a tint taken from it, specs and description. */
export function FilmInfoSheet({ film, onClose }: { film: Film; onClose: () => void }) {
  const { t, language } = useTranslation();
  const [color, setColor] = useState(fallbackFilmPageColor);
  useEffect(() => {
    let current = true;
    void filmPageColor(film).then(value => { if (current) setColor(value); });
    return () => { current = false; };
  }, [film]);
  const specs = [
    { label: t('filmInfoType'), value: t(film.type) },
    { label: t('format'), value: (film.formats ?? [film.format]).map(format => format === 'other' ? t('other') : format).join(' / ') },
    { label: 'ISO', value: String(film.iso) },
    { label: t('filmInfoProcess'), value: film.process || '—' },
    ...(film.status ? [{ label: t('filmInfoStatus'), value: t(statusLabels[film.status]) }] : []),
  ];
  const description = film.shortDescription?.[language] ?? film.shortDescription?.en;
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={[styles.page, { backgroundColor: color }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <FilmImage film={film} style={styles.coverImage} />
          <View pointerEvents="none" style={styles.fade}>
            {fadeSteps.map(opacity => <View key={opacity} style={{ flex: 1, backgroundColor: color, opacity }} />)}
          </View>
        </View>
        <Text style={styles.brand}>{film.brand}</Text>
        <Text accessibilityRole="header" style={styles.name}>{film.name}</Text>
        <View style={styles.specs}>
          {specs.map((spec, index) => <View key={spec.label} accessible accessibilityLabel={`${spec.label}: ${spec.value}`}
            style={[styles.spec, index > 0 && styles.specDivider]}>
            <Text numberOfLines={1} style={styles.specLabel}>{spec.label}</Text>
            {/* Long values such as "Discontinued" shrink to fit rather than breaking mid-word. */}
            <Text numberOfLines={spec.value.includes(' ') ? 2 : 1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.specValue}>{spec.value}</Text>
          </View>)}
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel={t('closeFilmInfo')} hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
        <SymbolView name="xmark" size={14} weight="semibold" tintColor="#FFFFFF" fallback={<Text style={styles.closeText}>✕</Text>} />
      </Pressable>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 48 },
  cover: { width: '100%', aspectRatio: 1.23 },
  coverImage: { width: '100%', height: '100%' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%' },
  brand: { marginTop: 4, color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: '700', letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase' },
  name: { marginTop: 6, paddingHorizontal: 24, color: '#FFFFFF', fontSize: 32, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  specs: { flexDirection: 'row', marginTop: 24, marginHorizontal: 16 },
  spec: { flex: 1, alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  specDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.3)' },
  specLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  specValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  description: { marginTop: 28, marginHorizontal: 24, color: 'rgba(255,255,255,0.88)', fontSize: 16, lineHeight: 26 },
  close: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  closeText: { color: '#FFFFFF', fontSize: 14 },
});
