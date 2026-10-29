import { FilmImage } from './FilmImage';
import { filterFilms } from '../utils/filterFilms';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, SectionList, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { BackButton } from '../../../components/ui/BackButton';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useThemedStyles } from '../../../constants/theme';
import type { Film } from '../../../types/models';
import { useTranslation } from '../../../i18n/useTranslation';
import { useFilmStore } from '../store/filmStore';
import { CustomFilmModal } from './CustomFilmModal';
import { FilmInfoSheet } from './FilmInfoSheet';
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
  const [info, setInfo] = useState<Film | null>(null);
  useEffect(() => () => {
    if (!edit && !change) useNewRollDraftStore.getState().reset();
  }, [edit, change]);
  const sections = useMemo(() => {
    const groups = new Map<string, typeof films>();
    filterFilms(films, query).forEach((film) => {
      groups.set(film.brand, [...(groups.get(film.brand) ?? []), film]);
    });
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([title, data]) => ({ title, data }));
  }, [films, query]);
  function select(filmId: string) {
    const selected = films.find(film => film.id === filmId);
    update({ filmId, filmOverride: selected?.isCustom ? {
      brand: selected.brand, name: selected.name, iso: selected.iso, type: selected.type,
      format: selected.format, formats: selected.formats, process: selected.process,
      imageUri: selected.imageUri, imageDocumentPath: selected.imageDocumentPath, imageKey: selected.imageKey ?? null,
    } : undefined });
    if (change && router.canGoBack()) router.back();
    else router.push('/new-roll/details');
  }
  return <Screen><KeyboardAvoidingView style={styles.layout} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><SectionList style={styles.list} sections={sections} keyExtractor={(film) => film.id} stickySectionHeadersEnabled={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}
    ListHeaderComponent={<><BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Text style={styles.title}>{t('selectFilm')}</Text><SearchBar placeholder={t('searchFilms')} value={query} onChangeText={setQuery} /></>}
    renderSectionHeader={({ section }) => <Text style={styles.brand}>{section.title}</Text>}
    renderItem={({ item }) => <View style={styles.row}>
      {/* Sibling buttons, so each is reachable by touch and VoiceOver: the cover opens the film's info page, the text selects it. */}
      <Pressable accessibilityRole="button" accessibilityLabel={`${t('filmInfo')}: ${item.brand} ${item.name}`} onPress={() => setInfo(item)} style={({ pressed }) => [styles.image, pressed && { opacity: 0.7 }]}>
        <FilmImage film={item} style={styles.imageFill} placeholderStyle={styles.secondary} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => select(item.id)} style={styles.selectButton}>
        <View style={styles.description}><Text style={styles.text}>{item.brand} {item.name}</Text><Text style={styles.secondary}>ISO {item.iso} · {t(item.type)} · {(item.formats ?? [item.format]).map(format => format === 'other' ? t('other') : format).join(' / ')}</Text></View><Text style={styles.secondary}>›</Text>
      </Pressable>
    </View>}
    ListEmptyComponent={<Text style={styles.secondary}>{t('noFilms')}</Text>}
  />
    <View style={styles.bottomBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('addCustomFilm')} style={styles.custom} onPress={() => { Keyboard.dismiss(); setCustom(true); }}>
        <Text style={styles.text}>+ {t('addCustomFilm')}</Text>
        <Text style={styles.secondary}>{t('filmFallback')}</Text>
      </Pressable>
    </View>
  </KeyboardAvoidingView>{custom ? <CustomFilmModal visible onClose={() => setCustom(false)} onAdded={select} /> : null}
  {info ? <FilmInfoSheet film={info} onClose={() => setInfo(null)} /> : null}
  </Screen>;
}
