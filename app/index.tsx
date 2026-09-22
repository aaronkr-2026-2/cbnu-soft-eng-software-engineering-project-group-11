import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EmptyState } from '../src/components/ui/EmptyState';
import { FilterChip } from '../src/components/ui/FilterChip';
import { IconButton } from '../src/components/ui/IconButton';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { SearchBar } from '../src/components/ui/SearchBar';
import { colors, spacing, typography } from '../src/constants/theme';
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
            <Text style={styles.archiveLabel}>PERSONAL ARCHIVE</Text>
            <IconButton
              accessibilityLabel="Open settings"
              icon="⚙"
              onPress={() => router.push('/settings')}
            />
          </View>
        </View>

        <SearchBar
          onChangeText={setSearchQuery}
          placeholder="Search films, cameras, rolls"
          value={searchQuery}
        />

        <View style={styles.chips}>
          {filters.map((filter) => (
            <FilterChip
              key={filter}
              label={filter}
              onPress={() => setActiveFilter(filter)}
              selected={filter === activeFilter}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT ROLLS</Text>
          <Text style={styles.rollCount}>{totalCount} ROLLS</Text>
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
              description="Try a different search or filter."
              title="No rolls found"
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.newRollButton}>
        <PrimaryButton label="+ New Roll" onPress={() => router.push('/new-roll')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 104,
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
  },
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  wordmark: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    letterSpacing: 2.4,
  },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  archiveLabel: {
    color: colors.secondaryText,
    fontSize: typography.size.micro,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.1,
  },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: 14 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 31,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.25,
  },
  rollCount: {
    color: colors.secondaryText,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
  },
  rollList: { gap: 12 },
  newRollButton: {
    bottom: 22,
    left: spacing.screen,
    position: 'absolute',
    right: spacing.screen,
  },
});
