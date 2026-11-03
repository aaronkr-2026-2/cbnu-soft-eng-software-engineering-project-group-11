import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkColors } from '../../../constants/colors';
import { useTranslation } from '../../../i18n/useTranslation';
import { cloudErrorLabels } from '../services/cloudLabels';
import { recordReferenceCheck, syncNow, useCloudStore } from '../services/cloudSync';
import { PhotosAccessService } from '../../settings/services/PhotosAccessService';
import { ReferenceRepairService } from '../../settings/services/ReferenceRepairService';

/** Nonblocking status: counts received records, never an estimated percentage or restore-success claim.
 * Afterwards, offers the Photos permission that restored frames need on a fresh install. */
export function CloudRestoreNotice() {
  const { t } = useTranslation();
  const sync = useCloudStore(state => state.sync);
  const photosUnresolved = useCloudStore(state => state.photosUnresolved);
  const [askPhotos, setAskPhotos] = useState(false);
  const progress = sync.restore;
  const synced = sync.enabled && sync.configured && sync.status === 'metadata-synced' && !progress;
  // After a reinstall, iOS has never asked for Photos access, so restored frames cannot resolve yet.
  useEffect(() => {
    if (!synced || !photosUnresolved) return;
    let current = true;
    void PhotosAccessService.read().then(access => { if (current) setAskPhotos(access === 'undetermined'); }).catch(() => {});
    return () => { current = false; };
  }, [synced, photosUnresolved]);
  async function allowPhotos() {
    setAskPhotos(false);
    try {
      if (await PhotosAccessService.request() === 'denied') return;
      recordReferenceCheck(await ReferenceRepairService.run());
    } catch { /* Settings > Sync Photos still offers access and repair. */ }
  }
  if (askPhotos && synced) return <SafeAreaView pointerEvents="box-none" edges={['bottom']} style={styles.position}>
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('cloudPhotosAccessTitle')}</Text>
        <Text style={styles.detail}>{t('cloudPhotosAccessBody')}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setAskPhotos(false)} style={styles.retry}>
        <Text style={styles.secondary}>{t('photoGuideNotNow')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => { void allowPhotos(); }} style={styles.retry}>
        <Text style={styles.title}>{t('cloudPhotosAccessAllow')}</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
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
  // Sits above Home's floating New Roll button instead of covering it.
  card: { backgroundColor: darkColors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: darkColors.border, padding: 16, marginBottom: 84, flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  title: { color: darkColors.text, fontSize: 14, fontWeight: '600' },
  detail: { color: darkColors.secondaryText, fontSize: 13, lineHeight: 18, marginTop: 4 },
  secondary: { color: darkColors.secondaryText, fontSize: 14 },
  retry: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
});
