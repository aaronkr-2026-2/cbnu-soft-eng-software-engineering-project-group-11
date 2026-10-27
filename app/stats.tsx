import { useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BackButton } from '../src/components/ui/BackButton';
import { useCameraStore } from '../src/features/cameras/store/cameraStore';
import { useFilmStore } from '../src/features/films/store/filmStore';
import { useRollStore } from '../src/features/rolls/store/rollStore';
import { createRollBrowseContext } from '../src/features/rolls/utils/rollBrowse';
import { activityYears, computeRollStats, rollShare, type StatCount } from '../src/features/rolls/utils/rollStats';
import { createRollStatsStyles } from '../src/features/rolls/styles/roll-stats.styles';
import { useThemedStyles } from '../src/constants/theme';
import { useAppStore } from '../src/store/app-store';
import { useTranslation } from '../src/i18n/useTranslation';

export default function Stats() {
  const styles = useThemedStyles(createRollStatsStyles);
  const appearance = useAppStore(state => state.appearance);
  const router = useRouter();
  const { t, language } = useTranslation();
  const rolls = useRollStore((state) => state.rolls);
  const films = useFilmStore((state) => state.films);
  const cameras = useCameraStore((state) => state.cameras);
  const year = new Date().getFullYear();
  const stats = useMemo(
    () => computeRollStats(rolls, films, createRollBrowseContext(films, cameras, language), year),
    [rolls, films, cameras, language, year],
  );
  const years = activityYears(stats.years);
  const max = Math.max(1, ...years.map(item => item.count));
  const favorite = stats.cameras[0];
  const countLabel = (count: number) => t(count === 1 ? 'rollCountOne' : 'rollCountOther', { count });

  function openFavorite(kind: 'film' | 'camera', item: StatCount) {
    router.push({ pathname: '/stats-rolls', params: { kind, key: item.key, title: item.label } });
  }

  function handleClose() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return <SafeAreaView style={styles.screen}>
    <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <BackButton onPress={handleClose} />
        <Text accessibilityRole="header" style={styles.title}>{t('statistics')}</Text>
        <View style={styles.spacer} />
      </View>
      <Text style={styles.subtitle}>{t('statsJourney')}</Text>
      <View style={styles.tiles}>
        <Tile value={stats.rollCount} label={t('statsTotalRolls')} />
        <Tile value={stats.photoCount} label={t('statsTotalPhotos')} />
      </View>
      <View style={[styles.card, styles.yearCard]}>
        <View style={styles.flex}>
          <Text style={styles.label}>{t('statsThisYear')} · {year}</Text>
          {stats.rollCount > 0 && <Text style={styles.detail}>{t('statsShare', { percent: rollShare(stats.thisYearCount, stats.rollCount) })}</Text>}
        </View>
        <Text style={styles.yearValue}>{stats.thisYearCount}</Text>
      </View>
      {stats.rollCount === 0 ? <View style={[styles.card, styles.emptyCard]}><Text style={styles.empty}>{t('statsEmpty')}</Text></View> : <>
        <Section title={t('statsActivity')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={years.length > 5} contentContainerStyle={styles.chartContent}>
            {years.map(item => <View key={item.key} accessible accessibilityLabel={`${item.label}: ${countLabel(item.count)}`} style={styles.column}>
              <Text style={styles.chartCount}>{item.count}</Text>
              <View style={styles.plot}><View style={[styles.bar, { height: `${item.count / max * 100}%` }, item.count === 0 && styles.zeroBar]} /></View>
              <Text style={styles.chartYear}>{item.label}</Text>
            </View>)}
          </ScrollView>
        </Section>
        <Section title={t('statsFavoriteFilms')}><Ranking items={stats.films} onPress={item => openFavorite('film', item)} /></Section>
        {favorite && <Section title={t('statsFavoriteCameras')}>
          <Pressable accessibilityRole="button" onPress={() => openFavorite('camera', favorite)} accessibilityLabel={`${favorite.label}: ${countLabel(favorite.count)}, ${t('statsShare', { percent: rollShare(favorite.count, stats.rollCount) })}`} style={({ pressed }) => [styles.favorite, pressed && styles.pressed]}>
            <Text style={styles.eyebrow}>{t('statsMostUsed')}</Text>
            <Text style={styles.cameraName}>{favorite.label}</Text>
            <Text style={styles.detail}>{countLabel(favorite.count)} · {t('statsShare', { percent: rollShare(favorite.count, stats.rollCount) })}</Text>
          </Pressable>
          <Ranking items={stats.cameras.slice(1)} start={2} onPress={item => openFavorite('camera', item)} />
        </Section>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Tile({ value, label }: { value: number; label: string }) {
  const styles = useThemedStyles(createRollStatsStyles);
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={[styles.card, styles.tile]}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={styles.tileValue}>{value}</Text>
    <Text style={styles.detail}>{label}</Text>
  </View>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useThemedStyles(createRollStatsStyles);
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>;
}

function Ranking({ items, start = 1, onPress }: { items: StatCount[]; start?: number; onPress: (item: StatCount) => void }) {
  const styles = useThemedStyles(createRollStatsStyles);
  const { t } = useTranslation();
  return <>{items.map((item, index) => <Pressable key={item.key} accessibilityRole="button" onPress={() => onPress(item)}
    accessibilityLabel={`${item.label}: ${t(item.count === 1 ? 'rollCountOne' : 'rollCountOther', { count: item.count })}`} style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.pressed]}>
    <Text style={styles.rank}>{String(index + start).padStart(2, '0')}</Text>
    <Text style={styles.label} numberOfLines={2}>{item.label}</Text>
    <Text style={styles.count}>{item.count}</Text>
    <Text style={styles.rank}>›</Text>
  </Pressable>)}</>;
}
