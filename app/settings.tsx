import { useTheme } from '../src/constants/theme';
import { useState } from 'react';
import { Alert, Linking, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/app-store';
import { useTranslation } from '../src/i18n/useTranslation';
import { languageLabels } from '../src/i18n/translations';
import { SettingsSelectModal } from '../src/features/settings/components/SettingsSelectModal';
import { SettingsGroup as Group, SettingsPage, SettingsRow as Row, SettingsNote as Note } from '../src/features/settings/components/SettingsPage';
import { setCloudEnabled, syncNow, useCloudStore } from '../src/features/cloud/services/cloudSync';
import { cloudLabels, cloudErrorLabels, cloudUnavailableLabels } from '../src/features/cloud/services/cloudLabels';
import { tipsEnabled } from '../src/constants/features';
import { supportUrl } from '../src/constants/links';

export default function Settings() {
  const colors = useTheme();
  const router = useRouter();
  const { t, language } = useTranslation();
  const settings = useAppStore();
  const sync = useCloudStore(state => state.sync);
  const photosUnresolved = useCloudStore(state => state.photosUnresolved);
  const [selector, setSelector] = useState<'language' | 'appearance' | null>(null);
  function select(save: () => void) {
    try { save(); setSelector(null); } catch { Alert.alert(t('settings'), t('saveError')); }
  }
  const open = (section: string) => router.push({ pathname: '/settings/[section]', params: { section } });
  function openLink(url: string, label: string) { Linking.openURL(url).catch(() => Alert.alert(label, t('prefsFailed'))); }
  // Home starts the tour again when it regains focus.
  function replayTips() {
    try { settings.resetGuides(); } catch { Alert.alert(t('settings'), t('saveError')); return; }
    if (router.canGoBack()) router.back(); else router.replace('/');
  }
  // The switch stays controlled by the saved state until the explanation is confirmed.
  function confirmCloud(enabled: boolean) {
    const save = () => { void setCloudEnabled(enabled).catch(() => Alert.alert(t('prefsCloudSync'), t('prefsFailed'))); };
    Alert.alert(t(enabled ? 'cloudEnableTitle' : 'cloudDisableTitle'), t(enabled ? 'cloudEnableBody' : 'cloudDisableBody'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t(enabled ? 'cloudEnableAction' : 'cloudDisableAction'), style: enabled ? 'default' : 'destructive', onPress: save },
    ]);
  }
  return <>
    <SettingsPage title={t('settings')}>
      <Group title={t('cloudHeading')}>
        <Row icon="☁" symbol="icloud.fill" iconColor="#3478F6" label={t('prefsCloudSync')} value={sync.configured ? undefined : t(cloudLabels[sync.status])}
          trailing={sync.configured ? <Switch accessibilityLabel={t('prefsCloudSync')} accessibilityHint={t('cloudSyncInfo')} value={sync.enabled}
            trackColor={{ false: colors.border, true: colors.success }} thumbColor="#FFFFFF" ios_backgroundColor={colors.border}
            onValueChange={confirmCloud} /> : undefined} />
        <Row icon="▧" symbol="photo.on.rectangle.angled" iconColor="#FF9500" label={t('prefsSyncPhotos')} onPress={() => open('sync-photos')} />
      </Group>
      {!sync.configured && sync.status === 'unavailable' && <Note>{t(cloudUnavailableLabels[sync.unavailableReason ?? 'configuration'])}</Note>}
      {sync.configured && <Note>{t('cloudSyncInfo')}</Note>}
      {sync.configured && <Note>{t(cloudLabels[sync.status])}{sync.lastSync ? ` · ${t('cloudLastSync')}: ${new Date(sync.lastSync).toLocaleString(language)}` : ''}{sync.pending ? ` · ${t('cloudPendingCount', { count: sync.pending })}` : ''}</Note>}
      {sync.error && <Note>{t(cloudErrorLabels[sync.errorKind ?? 'unknown'])}</Note>}
      {sync.status === 'metadata-synced' && photosUnresolved !== 0 && <Note>{photosUnresolved === null ? t('cloudPhotosUnchecked') : t('cloudPhotosUnresolved', { count: photosUnresolved })}</Note>}
      {sync.status === 'error' && <Row label={t('photoRetry')} onPress={() => { void syncNow(); }} />}
      <Group title={t('cloudDataHeading')}><Row icon="▤" symbol="internaldrive.fill" iconColor="#8E8E93" label={t('storage')} onPress={() => open('storage')} /></Group>
      <Group title={t('settings')}>
        <Row icon="文" symbol="globe" iconColor="#34C759" label={t('language')} value={languageLabels[settings.language]} onPress={() => setSelector('language')} />
        <Row icon="◐" symbol="circle.lefthalf.filled" iconColor="#5856D6" label={t('appearance')} value={t(settings.appearance)} onPress={() => setSelector('appearance')} />
        <Row icon="?" symbol="lightbulb.fill" iconColor="#FFB800" label={t('tourReplay')} onPress={replayTips} />
      </Group>
      <Group title={t('privacySupport')}>
        {tipsEnabled ? <Row icon="♥" symbol="heart.fill" iconColor="#FF3B30" label={t('tipTitle')} onPress={() => open('support-development')} /> : null}
        {supportUrl ? <Row icon="?" symbol="questionmark.bubble.fill" iconColor="#32ADE6" label={t('contactSupport')} onPress={() => openLink(supportUrl, t('contactSupport'))} /> : null}
        <Row icon="◇" symbol="hand.raised.fill" iconColor="#007AFF" label={t('privacyData')} onPress={() => router.push('/privacy')} />
      </Group>
    </SettingsPage>
    {selector === 'language' ? <SettingsSelectModal title={t('language')} value={settings.language} options={(['vi', 'en', 'ko'] as const).map(value => ({ value, label: languageLabels[value] }))} onSelect={value => select(() => settings.setLanguage(value))} onClose={() => setSelector(null)} /> : null}
    {selector === 'appearance' ? <SettingsSelectModal title={t('appearance')} value={settings.appearance} options={(['system', 'light', 'dark'] as const).map(value => ({ value, label: t(value) }))} onSelect={value => select(() => settings.setAppearance(value))} onClose={() => setSelector(null)} /> : null}
  </>;
}
