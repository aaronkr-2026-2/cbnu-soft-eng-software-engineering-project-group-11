import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { useRollStore } from '../rolls/store/rollStore';
import { useFilmStore } from '../films/store/filmStore';
import { FILM_ASSETS } from '../films/data/filmAssets';
import { filmImageUri } from '../films/services/FilmCoverStorage';
import { resolvePhoto } from '../photos/services/PhotoReferenceService';

/** Warm only the first screen; the rest of the archive loads on demand. */
export function StartupScreen({ onReady }: { onReady: () => void }) {
  const colors = useTheme();
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let active = true;
    let next = 0;
    let completed = 0;
    const finish = () => { if (active) { active = false; onReady(); } };
    // A missing file, denied Photos access or slow iCloud must never block startup.
    const deadline = setTimeout(finish, 6000);
    const start = setTimeout(() => {
      const rolls = useRollStore.getState().rolls;
      const films = useFilmStore.getState().films;
      const recent = [...rolls].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
      const tasks: (() => Promise<unknown>)[] = [];
      const covers = new Set<string>();
      for (const roll of recent) {
        const film = roll.filmOverride ?? films.find(item => item.id === roll.filmId);
        const uri = filmImageUri(film);
        const source = uri ? { uri } : film?.imageKey ? FILM_ASSETS[film.imageKey] : undefined;
        const imageUri = source ? Image.resolveAssetSource(source)?.uri : undefined;
        if (imageUri && !covers.has(imageUri)) {
          covers.add(imageUri);
          tasks.push(() => Image.prefetch(imageUri));
        }
        for (const photo of [...roll.photos].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 4)) {
          tasks.push(async () => {
            const result = await resolvePhoto(photo);
            if (active && result.uri) await Image.prefetch(result.uri);
          });
        }
      }
      setProgress(0.1);
      async function worker() {
        while (active && next < tasks.length) {
          const task = tasks[next++];
          try { await task(); } catch { /* Normal image placeholders handle unavailable sources. */ }
          completed++;
          if (active) setProgress(0.1 + 0.9 * completed / tasks.length);
        }
      }
      void Promise.all(Array.from({ length: Math.min(3, tasks.length) }, worker)).then(finish);
    }, 100); // Let the loading screen paint before preparing the first screen.
    return () => { active = false; clearTimeout(start); clearTimeout(deadline); };
  }, [onReady]);

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <View style={styles.content}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.frame, { borderColor: colors.text }]}>
        <View style={[styles.lens, { borderColor: colors.text }]} />
      </View>
      <Text style={[styles.wordmark, { color: colors.text }]}>FILMER</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>{t('startupSubtitle')}</Text>
    </View>
    <View style={styles.loading} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.text} />
      <Text style={[styles.label, { color: colors.secondaryText }]}>{t(progress === 0 ? 'startupData' : 'startupImages')}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel={t('startupImages')} accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={{ width: `${Math.round(progress * 100)}%`, height: 3, backgroundColor: colors.text }} />
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  content: { alignItems: 'center', gap: 16 },
  frame: { width: 66, height: 48, borderWidth: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  lens: { width: 24, height: 24, borderWidth: 2, borderRadius: 12 },
  wordmark: { fontSize: 34, fontWeight: '700', letterSpacing: 9 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  loading: { marginTop: 64, alignItems: 'center', gap: 16, width: '100%', maxWidth: 240 },
  label: { fontSize: 13, textAlign: 'center' },
  track: { width: '100%', height: 3, overflow: 'hidden', borderRadius: 2 },
});
