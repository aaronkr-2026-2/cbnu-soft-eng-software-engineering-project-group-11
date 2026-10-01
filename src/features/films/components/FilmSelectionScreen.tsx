import { useMemo, useState } from 'react';
import { Image, Pressable, SectionList, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { BackButton } from '../../../components/ui/BackButton';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { useFilmStore } from '../store/filmStore';
import { CustomFilmModal } from './CustomFilmModal';
import { useNewRollDraftStore } from '../../rolls/store/newRollDraftStore';
import { createFilmSelectionStyles } from '../../rolls/styles/film-selection.styles';

export function FilmSelectionScreen() {
  const styles = useThemedStyles(createFilmSelectionStyles);
  const { t } = useTranslation();
  const router = useRouter();
  const { change, edit } = useLocalSearchParams<{ change?: string; edit?: string }>();
  const films = useFilmStore((state) => state.films);
  const update = useNewRollDraftStore((state) => edit ? state.updateEdit : state.update);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState(false);
  const sections = useMemo(() => {
    const groups = new Map<string, typeof films>();
    films.filter((film) => `${film.brand} ${film.name} ${film.iso}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).forEach((film) => {
      groups.set(film.brand, [...(groups.get(film.brand) ?? []), film]);
    });
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([title, data]) => ({ title, data }));
  }, [films, query]);
  function select(filmId: string) {
    update({ filmId });
    if (change && router.canGoBack()) router.back();
    else router.push('/new-roll/details');
  }
  return <Screen><SectionList sections={sections} keyExtractor={(film) => film.id} stickySectionHeadersEnabled={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
    ListHeaderComponent={<><BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Text style={styles.title}>{t('selectFilm')}</Text><SearchBar placeholder={t('searchFilms')} value={query} onChangeText={setQuery} /></>}
    renderSectionHeader={({ section }) => <Text style={styles.brand}>{section.title}</Text>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => select(item.id)} style={styles.row}>
      {item.imageUri || item.imageUrl ? <Image resizeMode="contain" source={{ uri: item.imageUri ?? item.imageUrl }} style={styles.image} /> : <View style={styles.image}><Text style={styles.secondary}>{t('film')}</Text></View>}
      <View style={styles.description}><Text style={styles.text}>{item.brand} {item.name}</Text><Text style={styles.secondary}>ISO {item.iso} · {t(item.type)} · {item.format === 'other' ? t('other') : item.format}</Text></View><Text style={styles.secondary}>›</Text>
    </Pressable>}
    ListEmptyComponent={<Text style={styles.secondary}>{t('noFilms')}</Text>}
    ListFooterComponent={<Pressable accessibilityRole="button" style={styles.custom} onPress={() => setCustom(true)}><Text style={styles.text}>+ {t('addCustomFilm')}</Text><Text style={styles.secondary}>{t('filmFallback')}</Text></Pressable>}
  />{custom ? <CustomFilmModal visible onClose={() => setCustom(false)} onAdded={select} /> : null}</Screen>;
}
