import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/ui/Screen';
import { colors, spacing, typography } from '../src/constants/theme';
import { FilmCard } from '../src/features/films/components/FilmCard';
import { useFilmStore } from '../src/features/films/store/filmStore';

export default function Films() {
  const router = useRouter();
  const films = useFilmStore((state) => state.films);
  return <Screen><ScrollView contentContainerStyle={styles.content}><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.title}>Films</Text><View style={styles.grid}>{films.map((film) => <FilmCard film={film} key={film.id} onPress={() => router.replace({ pathname: '/new-roll', params: { filmId: film.id } })} selected={false} />)}</View></ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: spacing.screen, paddingTop: spacing.md }, back: { color: colors.text, fontSize: 17, marginBottom: spacing.lg }, title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg } });
