import { useTranslation } from '../src/i18n/useTranslation';
import { createHomeStyles } from '../src/features/home/styles/home.styles';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
  const resultsScroll = useRef<ScrollView>(null);
  const { groups, totalCount, photoCount } = useRolls({
    query: searchQuery,
    browseMode,
    language,
  });

  useEffect(() => {
    resultsScroll.current?.scrollTo({ y: 0, animated: false });
  }, [browseMode]);

  return (
    <Screen>
      <View style={styles.browseHeader}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>FILMER</Text>
          <View style={styles.headerActions}>
            <Text style={styles.archiveLabel}>{t('archive')}</Text>
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

      <ScrollView
        ref={resultsScroll}
        style={styles.resultsScroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {groups.length > 0 ? groups.map((group) => (
          <View key={group.key}>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>{group.title}</Text>
              <Text style={styles.rollCount}>
                {t(group.rolls.length === 1 ? 'rollCountOne' : 'rollCountOther', { count: group.rolls.length })}
              </Text>
            </View>
            <View style={styles.rollList}>
              {group.rolls.map((roll) => (
                <RollCard key={roll.id} roll={roll}
                  onPress={() => router.push({ pathname: '/rolls/[id]', params: { id: roll.id } })} />
              ))}
            </View>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <EmptyState
              description={t(totalCount === 0 && !searchQuery.trim() ? 'createRollToStart' : 'trySearch')}
              title={t(emptyLabels[browseMode])}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.newRollButton}>
        <PrimaryButton label={t('newRoll')} onPress={() => router.push('/new-roll')} />
      </View>
    </Screen>
  );
}
