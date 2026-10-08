import { FilmImage } from './FilmImage';
import { Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../../../constants/theme';
import type { Film } from '../../../types/models';
import { createFilmCardStyles } from '../styles/film-card.styles';

type FilmCardProps = { film: Film; onPress: () => void; selected: boolean };

export function FilmCard({ film, onPress, selected }: FilmCardProps) {
  const styles = useThemedStyles(createFilmCardStyles);

  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.card, selected && styles.selected]}>
    <View style={styles.imageArea}><FilmImage film={film} style={styles.image} placeholderStyle={styles.placeholder} /></View>
    <Text style={styles.brand}>{film.brand}</Text><Text numberOfLines={1} style={styles.name}>{film.name}</Text><Text style={styles.meta}>{film.iso} · {film.format}</Text>
  </Pressable>;
}
