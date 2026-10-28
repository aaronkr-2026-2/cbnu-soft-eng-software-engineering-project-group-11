import { FilmImage } from './FilmImage';
import { filterFilms } from '../utils/filterFilms';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, SectionList, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../components/ui/Screen';
import { BackButton } from '../../../components/ui/BackButton';
import { SearchBar } from '../../../components/ui/SearchBar';
import { useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { useFilmStore } from '../store/filmStore';
import { CustomFilmModal } from './CustomFilmModal';
import { AlphabetIndex } from './AlphabetIndex';
import { letterSections } from '../utils/alphabetIndex';
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
  const letters = useMemo(() => letterSections(sections.map(section => section.title)), [sections]);
  const list = useRef<SectionList<(typeof films)[number], { title: string }>>(null);
  const jump = useRef({ section: 0, retries: 0 });
  function scrollToSection(section: number) {
    list.current?.scrollToLocation({ sectionIndex: section, itemIndex: 0, viewOffset: 0, animated: false });
  }
  function selectSection(section: number) {
    jump.current = { section, retries: 0 };
    scrollToSection(section);
  }
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
  return <Screen><KeyboardAvoidingView style={styles.layout} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.listArea}><SectionList ref={list} style={styles.list} sections={sections} keyExtractor={(film) => film.id} stickySectionHeadersEnabled={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}
    ListHeaderComponent={<><BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/')} /><Text style={styles.title}>{t('selectFilm')}</Text><SearchBar placeholder={t('searchFilms')} value={query} onChangeText={setQuery} /></>}
    renderSectionHeader={({ section }) => <Text style={styles.brand}>{section.title}</Text>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => select(item.id)} style={styles.row}>
      <FilmImage film={item} style={styles.image} placeholderStyle={styles.secondary} />
      <View style={styles.description}><Text style={styles.text}>{item.brand} {item.name}</Text><Text style={styles.secondary}>ISO {item.iso} · {t(item.type)} · {(item.formats ?? [item.format]).map(format => format === 'other' ? t('other') : format).join(' / ')}</Text></View><Text style={styles.secondary}>›</Text>
    </Pressable>}
    ListEmptyComponent={<Text style={styles.secondary}>{t('noFilms')}</Text>}
    // A wide window lets the whole catalog finish rendering in background batches after the first
    // screen, so A–Z jumps land on measured section headers instead of estimates.
    windowSize={61} maxToRenderPerBatch={20}
    onScrollToIndexFailed={info => {
      // Sections far below have not been measured yet: jump near them, then retry once rows render.
      list.current?.getScrollResponder()?.scrollTo({ y: info.averageItemLength * info.index, animated: false });
      // Rows render in batches, so keep correcting the estimate until the target section is measured.
      if (jump.current.retries++ < 20) setTimeout(() => scrollToSection(jump.current.section), 100);
    }}
  />
    {!query.trim() && sections.length > 1 ? <AlphabetIndex sections={letters} onSelect={selectSection} /> : null}
  </View>
    <View style={styles.bottomBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('addCustomFilm')} style={styles.custom} onPress={() => { Keyboard.dismiss(); setCustom(true); }}>
        <Text style={styles.text}>+ {t('addCustomFilm')}</Text>
        <Text style={styles.secondary}>{t('filmFallback')}</Text>
      </Pressable>
    </View>
  </KeyboardAvoidingView>{custom ? <CustomFilmModal visible onClose={() => setCustom(false)} onAdded={select} /> : null}
  </Screen>;
}
