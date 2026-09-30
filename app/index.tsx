import { useTranslation } from '../src/i18n/useTranslation';
import { createHomeStyles } from '../src/features/home/styles/home.styles';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
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
import type { RollSearchField } from '../src/features/rolls/types';

type Filter = 'All' | 'Camera' | 'Film';

const filters: Filter[] = ['All', 'Camera', 'Film'];
const searchFieldByFilter: Record<Filter, RollSearchField> = {
  All: 'all',
  Camera: 'camera',
  Film: 'film',
};

export default function Home() {
  const { t } = useTranslation();
  const styles = useThemedStyles(createHomeStyles);

  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { rolls, totalCount } = useRolls({
    query: searchQuery,
    searchField: searchFieldByFilter[activeFilter],
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

        <SearchBar
          onChangeText={setSearchQuery}
          placeholder={t('search')}
          value={searchQuery}
        />

        <View style={styles.chips}>
          {filters.map((filter) => (
            <FilterChip
              key={filter}
              label={t(filter === 'All' ? 'all' : filter === 'Camera' ? 'camera' : 'film')}
              onPress={() => setActiveFilter(filter)}
              selected={filter === activeFilter}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('recentRolls')}</Text>
          <Text style={styles.rollCount}>{totalCount} {t('rolls')}</Text>
        </View>

        <View style={styles.rollList}>
          {rolls.length > 0 ? (
            rolls.map((roll) => (
              <RollCard
                key={roll.id}
                onPress={() =>
                  router.push({ pathname: '/rolls/[id]', params: { id: roll.id } })
                }
                roll={roll}
              />
            ))
          ) : (
            <EmptyState
              description={t('trySearch')}
              title={t('noRolls')}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.newRollButton}>
        <PrimaryButton label={t('newRoll')} onPress={() => router.push('/new-roll')} />
      </View>
    </Screen>
  );
}
