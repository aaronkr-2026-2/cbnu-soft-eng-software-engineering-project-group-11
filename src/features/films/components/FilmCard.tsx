import { useTranslation } from '../../../i18n/useTranslation';
import { Image, Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../../../constants/theme';
import type { Film } from '../../../types/models';
import { createFilmCardStyles } from '../styles/film-card.styles';

type FilmCardProps = { film: Film; onPress: () => void; selected: boolean };

export function FilmCard({ film, onPress, selected }: FilmCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createFilmCardStyles);

  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.card, selected && styles.selected]}>
    <View style={styles.imageArea}>{film.imageUri || film.imageUrl ? <Image source={{ uri: film.imageUri ?? film.imageUrl }} style={styles.image} /> : <Text style={styles.placeholder}>{t('film')}</Text>}</View>
    <Text style={styles.brand}>{film.brand}</Text><Text numberOfLines={1} style={styles.name}>{film.name}</Text><Text style={styles.meta}>{film.iso} · {film.format}</Text>
  </Pressable>;
}
