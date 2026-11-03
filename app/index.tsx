import { useTranslation } from '../src/i18n/useTranslation';
import { createHomeStyles } from '../src/features/home/styles/home.styles';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, FlatList, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { EmptyState } from '../src/components/ui/EmptyState';
import { FilterChip } from '../src/components/ui/FilterChip';
import { IconButton } from '../src/components/ui/IconButton';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { SearchBar } from '../src/components/ui/SearchBar';
import { useThemedStyles } from '../src/constants/theme';
import { RollCard } from '../src/features/rolls/components/RollCard';
import { useRolls } from '../src/features/rolls/hooks/useRolls';
import type { Roll, RollBrowseMode } from '../src/features/rolls/types';
import type { TranslationKey } from '../src/i18n/translations';
import { HomeTour, type TourTarget } from '../src/features/home/components/HomeTour';
import { homeTourSteps, useAppStore } from '../src/store/app-store';

type GalleryRow = { key: string } & (
  | { kind: 'header'; title: string; count: number }
  | { kind: 'roll'; roll: Roll; last: boolean }
);

const browseModes: RollBrowseMode[] = ['all', 'date', 'film', 'camera', 'location'];
const modeLabels: Record<RollBrowseMode, TranslationKey> = {
  all: 'all', date: 'date', film: 'film', camera: 'camera', location: 'location',
};
const emptyLabels: Record<RollBrowseMode, TranslationKey> = {
  all: 'noRollsYet', date: 'noDatedRolls', film: 'noFilmRolls', camera: 'noCameraRolls', location: 'noLocationRolls',
};

export default function Home() {
  const { t, language } = useTranslation();
  const styles = useThemedStyles(createHomeStyles);

  const router = useRouter();
  const resultsList = useRef<FlatList<GalleryRow>>(null);
  const [browseMode, setBrowseMode] = useState<RollBrowseMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { groups, totalCount, photoCount } = useRolls({
    query: searchQuery,
    browseMode,
    language,
  });

  const newRollTarget = useRef<View>(null);
  const browseTarget = useRef<View>(null);
  const statsTarget = useRef<View>(null);
  const settingsTarget = useRef<View>(null);
  const markHomeTourSeen = useAppStore((state) => state.markHomeTourSeen);
  const [tour, setTour] = useState<{ run: number; steps: TourTarget[] } | null>(null);
  // Chosen once per focus so marking a step seen does not restart the running tour.
  // Stats only exists once a roll is saved, so its tip waits for a later visit.
  useFocusEffect(useCallback(() => {
    const tourSeen = useAppStore.getState().homeTourSeen;
    const targets: TourTarget[] = [
      { id: 'newRoll', target: newRollTarget, title: 'tourNewRollTitle', body: 'tourNewRollBody' },
      { id: 'browse', target: browseTarget, title: 'tourBrowseTitle', body: 'tourBrowseBody' },
      { id: 'stats', target: statsTarget, title: 'tourStatsTitle', body: 'tourStatsBody' },
      { id: 'settings', target: settingsTarget, title: 'tourSettingsTitle', body: 'tourSettingsBody' },
    ];
    const timer = setTimeout(() => {
      const steps = targets.filter(step => !tourSeen.includes(step.id) && step.target.current);
      if (steps.length) setTour(value => ({ run: (value?.run ?? 0) + 1, steps }));
    }, 600);
    return () => { clearTimeout(timer); setTour(null); };
  }, []));
  function markSeen(steps: TourTarget['id'][]) {
    try { markHomeTourSeen(steps); } catch { /* Tips may repeat if the preference cannot be saved. */ }
  }

  // Preserve the filter's previous start-at-top behavior without replacing the list.
  useLayoutEffect(() => { resultsList.current?.scrollToOffset({ offset: 0, animated: false }); }, [browseMode]);

  // Flat row keys preserve shared Roll identity when their grouping changes.
  // SectionList prefixes item keys with the section key, remounting every card across modes.
  const rows = useMemo<GalleryRow[]>(() => groups.flatMap(group => [
    { key: `header:${group.key}`, kind: 'header' as const, title: group.title, count: group.rolls.length },
    ...group.rolls.map((roll, index) => ({ key: `roll:${roll.id}`, kind: 'roll' as const, roll, last: index === group.rolls.length - 1 })),
  ]), [groups]);

  return (
    <Screen>
      <View style={styles.browseHeader}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>FiLog</Text>
          <View ref={settingsTarget} collapsable={false} style={styles.headerActions}>
            <IconButton
              accessibilityLabel={t('settings')}
              icon="⚙"
              symbol="slider.horizontal.3"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        {totalCount > 0 ? <Pressable ref={statsTarget} accessibilityRole="button" accessibilityLabel={t('statistics')} hitSlop={8}
          onPress={() => router.push('/stats')} style={styles.summary}>
          <Text style={styles.summaryText}>{t('statsSummary', {
            rolls: t(totalCount === 1 ? 'rollCountOne' : 'rollCountOther', { count: totalCount }),
            photos: t(photoCount === 1 ? 'photoCountOne' : 'photoCountOther', { count: photoCount }),
          })} ›</Text>
        </Pressable> : null}

        <View ref={browseTarget} collapsable={false}>
        <SearchBar
          onChangeText={setSearchQuery}
          placeholder={t('search')}
          value={searchQuery}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.browseSelector}
          keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
          {browseModes.map((mode) => (
            <FilterChip
              key={mode}
              label={t(modeLabels[mode])}
              onPress={() => setBrowseMode(mode)}
              selected={mode === browseMode}
            />
          ))}
        </ScrollView>
        </View>
      </View>

      <FlatList
        ref={resultsList}
        data={rows}
        keyExtractor={row => row.key}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        style={styles.resultsScroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => item.kind === 'header' ? <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{item.title}</Text>
          <Text style={styles.rollCount}>{t(item.count === 1 ? 'rollCountOne' : 'rollCountOther', { count: item.count })}</Text>
        </View> : <View style={!item.last ? { marginBottom: styles.rollList.gap } : undefined}>
          <RollCard roll={item.roll} onPress={() => router.push({ pathname: '/rolls/[id]', params: { id: item.roll.id } })} />
        </View>}
        ListEmptyComponent={<View style={styles.emptyState}><EmptyState
          description={t(totalCount === 0 && !searchQuery.trim() ? 'createRollToStart' : 'trySearch')}
          title={t(emptyLabels[browseMode])}
        /></View>}
      />

      <View ref={newRollTarget} collapsable={false} style={styles.newRollButton}>
        <PrimaryButton label={t('newRoll')} onPress={() => router.push('/new-roll')} />
      </View>
      {tour ? <HomeTour key={tour.run} steps={tour.steps} onSeen={step => markSeen([step])}
        onSkip={() => { markSeen(homeTourSteps); setTour(null); }} /> : null}
    </Screen>
  );
}
