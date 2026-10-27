import { useTranslation } from '../src/i18n/useTranslation';
import { createHomeStyles } from '../src/features/home/styles/home.styles';
import { useState } from 'react';
import { Pressable, ScrollView, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '../src/components/ui/EmptyState';
import { FilterChip } from '../src/components/ui/FilterChip';
import { IconButton } from '../src/components/ui/IconButton';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { SearchBar } from '../src/components/ui/SearchBar';
import { useThemedStyles } from '../src/constants/theme';
import { RollCard } from '../src/features/rolls/components/RollCard';
import { useRolls } from '../src/features/rolls/hooks/useRolls';
import type { RollBrowseMode } from '../src/features/rolls/types';
import type { TranslationKey } from '../src/i18n/translations';

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
  const [browseMode, setBrowseMode] = useState<RollBrowseMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { groups, totalCount, photoCount } = useRolls({
    query: searchQuery,
    browseMode,
    language,
  });

  return (
    <Screen>
      <View style={styles.browseHeader}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>FiLog</Text>
          <View style={styles.headerActions}>
            <IconButton
              accessibilityLabel={t('settings')}
              icon="⚙"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        {totalCount > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={t('statistics')} hitSlop={8}
          onPress={() => router.push('/stats')} style={styles.summary}>
          <Text style={styles.summaryText}>{t('statsSummary', {
            rolls: t(totalCount === 1 ? 'rollCountOne' : 'rollCountOther', { count: totalCount }),
            photos: t(photoCount === 1 ? 'photoCountOne' : 'photoCountOther', { count: photoCount }),
          })} ›</Text>
        </Pressable> : null}

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

      <SectionList
        key={browseMode}
        sections={groups.map(group => ({ ...group, data: group.rolls }))}
        keyExtractor={roll => roll.id}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        stickySectionHeadersEnabled={false}
        style={styles.resultsScroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.rollCount}>{t(section.data.length === 1 ? 'rollCountOne' : 'rollCountOther', { count: section.data.length })}</Text>
        </View>}
        renderItem={({ item: roll, index, section }) => <View style={index < section.data.length - 1 ? { marginBottom: styles.rollList.gap } : undefined}>
          <RollCard roll={roll} onPress={() => router.push({ pathname: '/rolls/[id]', params: { id: roll.id } })} />
        </View>}
        ListEmptyComponent={<View style={styles.emptyState}><EmptyState
          description={t(totalCount === 0 && !searchQuery.trim() ? 'createRollToStart' : 'trySearch')}
          title={t(emptyLabels[browseMode])}
        /></View>}
      />

      <View style={styles.newRollButton}>
        <PrimaryButton label={t('newRoll')} onPress={() => router.push('/new-roll')} />
      </View>
    </Screen>
  );
}
