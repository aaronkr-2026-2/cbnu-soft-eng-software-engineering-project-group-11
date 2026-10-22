import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkColors } from '../../../constants/colors';
import { useTranslation } from '../../../i18n/useTranslation';
import { cloudErrorLabels } from '../services/cloudLabels';
import { syncNow, useCloudStore } from '../services/cloudSync';

/** Nonblocking status: counts received records, never an estimated percentage or restore-success claim. */
export function CloudRestoreNotice() {
  const { t } = useTranslation();
  const sync = useCloudStore(state => state.sync);
  const progress = sync.restore;
  if (!progress || !sync.enabled || !sync.configured) return null;
  const paused = progress.phase === 'paused';
  return <SafeAreaView pointerEvents="box-none" edges={['bottom']} style={styles.position}>
    <View style={styles.card}>
      <View style={styles.copy} accessibilityLiveRegion="polite">
        <Text style={styles.title}>{t(paused ? 'cloudRestorePaused' : 'cloudRestoring')}</Text>
        <Text style={styles.detail}>{t(paused ? cloudErrorLabels[sync.errorKind ?? 'unknown'] : progress.phase === 'applying' ? 'cloudRestoreApplying' : 'cloudRestoreReceived', { count: progress.received })}</Text>
      </View>
      {paused && <Pressable accessibilityRole="button" onPress={() => { void syncNow(); }} style={styles.retry}>
        <Text style={styles.title}>{t('photoRetry')}</Text>
      </Pressable>}
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  position: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20 },
  card: { backgroundColor: darkColors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: darkColors.border, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  title: { color: darkColors.text, fontSize: 14, fontWeight: '600' },
  detail: { color: darkColors.secondaryText, fontSize: 13, lineHeight: 18, marginTop: 4 },
  retry: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
});
