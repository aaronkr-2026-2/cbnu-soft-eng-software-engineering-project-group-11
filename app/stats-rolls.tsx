import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackButton } from '../src/components/ui/BackButton';
import { Screen } from '../src/components/ui/Screen';
import { spacing, useThemedStyles, type ThemeColors } from '../src/constants/theme';
import { useCameraStore } from '../src/features/cameras/store/cameraStore';
import { useFilmStore } from '../src/features/films/store/filmStore';
import { useRollStore } from '../src/features/rolls/store/rollStore';
import { RollCard } from '../src/features/rolls/components/RollCard';
import { createRollBrowseContext } from '../src/features/rolls/utils/rollBrowse';
import { favoriteRolls } from '../src/features/rolls/utils/rollStats';
import { useTranslation } from '../src/i18n/useTranslation';

export default function StatsRolls() {
  const params = useLocalSearchParams<{ kind?: string; key?: string; title?: string }>();
  const router = useRouter();
  const { t, language } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const rolls = useRollStore(state => state.rolls);
  const films = useFilmStore(state => state.films);
  const cameras = useCameraStore(state => state.cameras);
  const matches = useMemo(() =>
    typeof params.key === 'string' && (params.kind === 'film' || params.kind === 'camera')
      ? favoriteRolls(rolls, createRollBrowseContext(films, cameras, language), params.kind, params.key) : [],
  [rolls, films, cameras, language, params.kind, params.key]);

  return <Screen>
    <View style={styles.header}>
      <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/stats')} />
      <View style={styles.titleBlock}>
        <Text accessibilityRole="header" style={styles.title}>{typeof params.title === 'string' ? params.title : t('statistics')}</Text>
        <Text style={styles.detail}>{t(matches.length === 1 ? 'rollCountOne' : 'rollCountOther', { count: matches.length })}</Text>
      </View>
    </View>
    <FlatList data={matches} keyExtractor={roll => roll.id} contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={<Text style={styles.detail}>{t('noRollsYet')}</Text>}
      renderItem={({ item }) => <RollCard roll={item} onPress={() => router.push({ pathname: '/rolls/[id]', params: { id: item.id } })} />} />
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.screen },
  titleBlock: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  detail: { color: colors.secondaryText, fontSize: 14, marginTop: spacing.xs },
  list: { padding: spacing.screen, paddingTop: spacing.sm, paddingBottom: 40 },
  separator: { height: spacing.md },
});
