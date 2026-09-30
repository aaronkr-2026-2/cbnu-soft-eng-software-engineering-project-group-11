import { useTranslation } from '../../../i18n/useTranslation';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type ThemeColors, radii, spacing, typography } from '../../../constants/theme';
import type { Film } from '../../../types/models';

type FilmCardProps = { film: Film; onPress: () => void; selected: boolean };

export function FilmCard({ film, onPress, selected }: FilmCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.card, selected && styles.selected]}>
    <View style={styles.imageArea}>{film.imageUri || film.imageUrl ? <Image source={{ uri: film.imageUri ?? film.imageUrl }} style={styles.image} /> : <Text style={styles.placeholder}>{t('film')}</Text>}</View>
    <Text style={styles.brand}>{film.brand}</Text><Text numberOfLines={1} style={styles.name}>{film.name}</Text><Text style={styles.meta}>{film.iso} · {film.format}</Text>
  </Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, height: 210, padding: spacing.sm, width: 154 },
  selected: { borderColor: colors.text, borderWidth: 1.5 },
  imageArea: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, height: 112, justifyContent: 'center', marginBottom: spacing.sm, overflow: 'hidden' },
  image: { height: '100%', width: '100%' }, placeholder: { color: colors.secondaryText, fontSize: typography.size.micro, fontWeight: typography.weight.bold, letterSpacing: 1 },
  brand: { color: colors.secondaryText, fontSize: typography.size.small }, name: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold, marginTop: 1 }, meta: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xxs },
});
