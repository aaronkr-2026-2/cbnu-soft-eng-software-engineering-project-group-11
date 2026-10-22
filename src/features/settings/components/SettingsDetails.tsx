import { useSettingsData } from '../hooks/useSettingsData';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from '../../../i18n/useTranslation';
import type { TranslationKey } from '../../../i18n/translations';
import { useAppStore } from '../../../store/app-store';
import { useRollStore } from '../../rolls/store/rollStore';
import { useFilmStore } from '../../films/store/filmStore';
import { resolveRollFilm } from '../../films/utils/resolveRollFilm';
import { photoCacheInfo, photoModuleAvailable } from '../../photos/services/PhotoReferenceService';
import { relinkPhoto } from '../../photos/services/PhotoRelinkService';
import { PhotosAccessService } from '../services/PhotosAccessService';
import { ReferenceRepairService, type RepairReport, type RepairIssue } from '../services/ReferenceRepairService';
import { PhotoCacheClearError, StorageService } from '../services/StorageService';
import { useCloudStore, recordReferenceCheck } from '../../cloud/services/cloudSync';
import { SettingsSelectModal } from './SettingsSelectModal';
import { SettingsGroup as Group, SettingsNote as Note, SettingsPage, SettingsRow as Row, settingsStyles as styles } from './SettingsPage';

const issueLabels: Record<RepairIssue['reason'], TranslationKey> = {
  unavailable: 'photoUnavailable', 'permission-denied': 'cloudPermissionReason', limited: 'photoAccessLimited', 'temporary-error': 'photoTemporaryError',
};
export function SyncPhotosSettings() {
  const { t } = useTranslation();
  const router = useRouter();
  const rolls = useRollStore(state => state.rolls);
  const films = useFilmStore(state => state.films);
  const [report, setReport] = useState<RepairReport>();
  const [activity, setActivity] = useState<'scan' | 'relink' | null>(null);
  const busy = activity !== null;
  const [status, setStatus] = useState<'idle' | 'done' | 'stopped' | 'error'>('idle');
  const [affectedOnly, setAffectedOnly] = useState(false);
  const [limit, setLimit] = useState(50);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  useFocusEffect(useCallback(() => () => { controller.current?.abort(); }, []));
  async function scan(only?: ReadonlySet<string>) {
    if (controller.current) return;
    const operation = new AbortController(); controller.current = operation;
    setActivity('scan'); setStatus('idle'); setAffectedOnly(!!only); setLimit(50);
    try {
      const access = await PhotosAccessService.read();
      if (!photoModuleAvailable) throw new Error('Native Photos module unavailable');
      if (operation.signal.aborted) { if (mounted.current) setStatus('stopped'); return; }
      if (access === 'undetermined') await PhotosAccessService.request();
      const result = await ReferenceRepairService.run(value => { if (mounted.current) setReport(value); }, operation.signal, only);
      if (mounted.current) { setReport(result); setStatus(operation.signal.aborted ? 'stopped' : 'done'); }
      if (!only && !operation.signal.aborted) recordReferenceCheck(result);
    } catch { if (mounted.current) setStatus('error'); }
    finally { controller.current = null; if (mounted.current) setActivity(null); }
  }
  const issues = report?.issues ?? [];
  async function relink(issue: RepairIssue) {
    if (busy) return;
    setActivity('relink');
    try { await relinkPhoto(issue.rollId, issue.photoId); }
    catch { Alert.alert(t('relinkPhoto'), t('prefsFailed')); }
    finally { setActivity(null); }
    await scan();
  }
  return <SettingsPage title={t('prefsSyncPhotos')}>
    <View style={styles.scanSummary}>
      {(['available', 'recovered', 'unavailable'] as const).map(key => <View key={key} style={styles.scanMetric} accessible accessibilityLabel={`${t(key === 'available' ? 'prefsAvailable' : key === 'recovered' ? 'cloudRepaired' : 'photoUnavailable')}: ${report ? key === 'unavailable' ? issues.length : report[key] : '—'}`}>
        <Text style={styles.scanValue}>{report ? key === 'unavailable' ? issues.length : report[key] : '—'}</Text>
        <Text style={styles.scanLabel}>{t(key === 'available' ? 'prefsAvailable' : key === 'recovered' ? 'cloudRepaired' : 'photoUnavailable')}</Text>
      </View>)}
    </View>
    <Note>{t('cloudScanBody')}</Note>
    <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} onPress={() => { void scan(); }} style={({ pressed }) => [styles.scanButton, (pressed || busy) && styles.dimmed]}><Text style={styles.scanButtonText}>{t(activity === 'relink' ? 'openingPhotos' : busy ? 'prefsLoading' : 'cloudScan')}</Text></Pressable>
    {affectedOnly && <Note>{t('cloudAffectedOnly')}</Note>}
    {activity === 'scan' && report && <Note>{t('prefsChecked', { checked: report.checked, total: report.total })}</Note>}
    {activity === 'scan' && <Row label={t('prefsStop')} onPress={() => controller.current?.abort()} />}
    {status === 'error' && <Note>{t(photoModuleAvailable ? 'prefsFailed' : 'photoModuleMissing')}</Note>}
    {status === 'done' && <Note>{t(report?.total === 0 ? 'prefsNoReferences' : 'prefsCheckDone')}</Note>}
    {status === 'stopped' && <Note>{t('prefsCheckStopped')}</Note>}
    {issues.length > 0 && <Group title={t('cloudNeedsAttention')}>
      <Row label={t('cloudRetryFailed')} disabled={busy} onPress={() => { void scan(new Set(issues.map(issue => JSON.stringify([issue.rollId, issue.photoId])))); }} />
      {issues.some(issue => issue.reason === 'limited' || issue.reason === 'permission-denied') && <Row label={t('managePhotosAccess')} disabled={busy} onPress={() => { void PhotosAccessService.manage().catch(() => Alert.alert(t('prefsAccess'), t('prefsFailed'))); }} />}
    </Group>}
    {issues.slice(0, limit).map(issue => {
      const roll = rolls.find(roll => roll.id === issue.rollId);
      if (!roll) return null;
      const film = resolveRollFilm(films, roll);
      const frame = [...roll.photos].sort((a, b) => a.sortOrder - b.sortOrder).findIndex(photo => photo.id === issue.photoId) + 1;
      if (frame < 1) return null;
      return <Group key={JSON.stringify([issue.rollId, issue.photoId])} title={`${film ? `${film.brand} ${film.name}` : roll.filmName} · ${t('cloudFrame', { count: frame })}`}>
        <Row label={t(issueLabels[issue.reason])} onPress={() => router.push({ pathname: '/rolls/[id]', params: { id: roll.id } })} />
        {issue.reason === 'unavailable' && <Row label={t('relinkPhoto')} disabled={busy} onPress={() => { void relink(issue); }} />}
      </Group>;
    })}
    {issues.length > limit && <Row label={t('cloudShowMore')} onPress={() => setLimit(value => value + 50)} />}
  </SettingsPage>;
}
const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
export function StorageSettings() {
  const { t } = useTranslation();
  const state = useSettingsData(StorageService.measure);
  const sync = useCloudStore(state => state.sync);
  const quality = useAppStore(state => state.photoQuality);
  const [qualitySheet, setQualitySheet] = useState(false);
  const [clearing, setClearing] = useState(false);
  async function clear() {
    if (clearing) return;
    setClearing(true);
    try {
      const info = await photoCacheInfo();
      Alert.alert(t('prefsClearCache'), t('prefsClearConfirm', { size: formatBytes(info.bytes) }), [
        { text: t('cancel'), style: 'cancel', onPress: () => setClearing(false) },
        { text: t('clear'), style: 'destructive', onPress: () => {
          void StorageService.clearPhotoCache().then(bytes => Alert.alert(t('prefsClearCache'), t('prefsFreed', { size: formatBytes(bytes) })),
            error => Alert.alert(t('prefsClearCache'), error instanceof PhotoCacheClearError && error.freedBytes !== null ? t('prefsCachePartial', { size: formatBytes(error.freedBytes) }) : t('prefsCacheRetry')))
            .finally(() => { setClearing(false); state.refresh(); });
        } },
      ], { cancelable: true, onDismiss: () => setClearing(false) });
    } catch { setClearing(false); Alert.alert(t('prefsClearCache'), t('prefsFailed')); }
  }
  const data = state.data;
  const verified = sync.enabled && sync.status === 'metadata-synced' && !!sync.lastSync;
  return <>
    <SettingsPage title={t('storage')}>
      <View style={styles.storageSection}>
        <View style={styles.storageCard}>
          {data && !state.loading ? <>
            <Row iconColor="#ff454b" icon="▧" label={t('storagePhotoCache')} value={data.cache === null ? '—' : formatBytes(data.cache)} disabled={clearing || data.cache === null || state.error} onPress={() => { void clear(); }} />
            <Row iconColor="#ff454b" icon="▤" label={t('storageRollDatabase')} value={formatBytes(data.database)} />
            <Row iconColor="#ff454b" icon="⚙" label={t('storageAppSettings')} value={t('storageSharedDatabase')} onPress={() => setQualitySheet(true)} />
            {data.covers + data.copies + data.other > 0 && <Row iconColor="#ff454b" icon="▣" label={t('storageSavedFiles')} value={formatBytes(data.covers + data.copies + data.other)} />}
          </> : <Row label={t(state.loading ? 'prefsLoading' : 'prefsUnavailable')} />}
        </View>
        <Note>{t('cloudLocalBody')}</Note>
        {state.error && <Row label={t('prefsRefresh')} onPress={state.refresh} />}
        {data?.cache === null && <Note>{t('prefsPartial')}</Note>}
      </View>
      <View style={styles.storageSection}>
        <Text accessibilityRole="header" style={styles.storageHeading}>{t('prefsCloudStorage')}</Text>
        <View style={[styles.storageCard, styles.storageInfo]}>
          <Text style={styles.storageInfoTitle}>{t('cloudStorageTitle')}</Text>
          <Text style={styles.storageBody}>{t(verified ? 'cloudStorageVerified' : 'cloudStorageUnverified')}</Text>
          <View style={styles.storageDivider} />
          <Text style={styles.storageInfoTitle}>{t(verified ? 'cloudContents' : 'cloudContentsPending')}</Text>
          <Text style={styles.storageBody}>{t('cloudContentsBody')}</Text>
          <Text style={styles.storageBody}>{t('cloudOriginalsBody')}</Text>
        </View>
      </View>
      <View style={styles.storageDeleteSection}>
        <Pressable accessibilityRole="link" style={[styles.storageCard, styles.storageInfo]} onPress={() => { void Linking.openURL('https://support.apple.com/108922').catch(() => Alert.alert(t('storageDeleteCloud'), t('prefsFailed'))); }}>
          <Text style={styles.storageInfoTitle}>{t('storageDeleteCloud')}</Text>
          <Text style={styles.storageBody}>{t('cloudDeleteBody')}</Text>
        </Pressable>
      </View>
      <View style={styles.storageSection}>
        <Text accessibilityRole="header" style={styles.storageHeading}>{t('prefsProtection')}</Text>
        <View style={[styles.storageCard, styles.storageInfo]}>
          <View style={styles.storageSafetyTitle}><Text accessible={false} style={styles.storageSafetyMark}>i</Text><Text style={styles.storageInfoTitle}>{t('cloudDataSafety')}</Text></View>
          <Text style={styles.storageBody}>{t('cloudSafetyBody')}</Text>
        </View>
      </View>
    </SettingsPage>
    {qualitySheet && <SettingsSelectModal tone="dark" title={t('prefsQuality')} value={quality} options={[{ value: 'optimized', label: t('prefsOptimized') }, { value: 'high', label: t('prefsHigh') }]}
      onSelect={value => { try { useAppStore.getState().setPhotoQuality(value); setQualitySheet(false); } catch { Alert.alert(t('prefsQuality'), t('saveError')); } }} onClose={() => setQualitySheet(false)} />}
  </>;
}
