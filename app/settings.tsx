import { useState } from 'react';
import { Alert, Linking, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../src/store/app-store';
import { useTranslation } from '../src/i18n/useTranslation';
import { languageLabels } from '../src/i18n/translations';
import { SettingsSelectModal } from '../src/features/settings/components/SettingsSelectModal';
import { SettingsGroup as Group, SettingsPage, SettingsRow as Row, SettingsNote as Note } from '../src/features/settings/components/SettingsPage';
import { setCloudEnabled, syncNow, useCloudStore } from '../src/features/cloud/services/cloudSync';
import { cloudLabels, cloudErrorLabels } from '../src/features/cloud/services/cloudLabels';
import { privacyPolicyUrl, supportUrl } from '../src/constants/links';

export default function Settings() {
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
  return <>
    <SettingsPage title={t('settings')}>
      <Group title={t('cloudHeading')}>
        <Row icon="☁" label={t('prefsCloudSync')} value={sync.configured ? undefined : t(cloudLabels[sync.status])}
          trailing={sync.configured ? <Switch accessibilityLabel={t('prefsCloudSync')} accessibilityHint={t('cloudBeta')} value={sync.enabled}
            trackColor={{ false: '#39393B', true: '#D1D1D6' }} thumbColor={sync.enabled ? '#111111' : '#FFFFFF'}
            onValueChange={value => { void setCloudEnabled(value).catch(() => Alert.alert(t('prefsCloudSync'), t('prefsFailed'))); }} /> : undefined} />
        <Row icon="▧" label={t('prefsSyncPhotos')} onPress={() => open('sync-photos')} />
      </Group>
      {!sync.configured && sync.status === 'unavailable' && <Note>{t('cloudBuildUnavailable')}</Note>}
      {sync.configured && <Note>{t(cloudLabels[sync.status])} · {t('cloudBeta')}{sync.lastSync ? ` · ${t('cloudLastSync')}: ${new Date(sync.lastSync).toLocaleString(language)}` : ''}{sync.pending ? ` · ${t('cloudPendingCount', { count: sync.pending })}` : ''}</Note>}
      {sync.error && <Note>{t(cloudErrorLabels[sync.errorKind ?? 'unknown'])}</Note>}
      {sync.status === 'metadata-synced' && photosUnresolved !== 0 && <Note>{photosUnresolved === null ? t('cloudPhotosUnchecked') : t('cloudPhotosUnresolved', { count: photosUnresolved })}</Note>}
      {sync.status === 'error' && <Row label={t('photoRetry')} onPress={() => { void syncNow(); }} />}
      <Group title={t('cloudDataHeading')}><Row icon="▤" label={t('storage')} onPress={() => open('storage')} /></Group>
      <Group title={t('settings')}>
        <Row icon="文" label={t('language')} value={languageLabels[settings.language]} onPress={() => setSelector('language')} />
        <Row icon="◐" label={t('appearance')} value={t(settings.appearance)} onPress={() => setSelector('appearance')} />
      </Group>
      <Group title={t('privacySupport')}>
        <Row icon="◇" label={t('privacyData')} onPress={() => router.push('/privacy')} />
        {privacyPolicyUrl ? <Row icon="↗" label={t('privacyPolicyWeb')} onPress={() => openLink(privacyPolicyUrl, t('privacyPolicyWeb'))} /> : null}
        {supportUrl ? <Row icon="↗" label={t('contactSupport')} onPress={() => openLink(supportUrl, t('contactSupport'))} /> : null}
      </Group>
    </SettingsPage>
    {selector === 'language' ? <SettingsSelectModal tone="dark" title={t('language')} value={settings.language} options={(['vi', 'en', 'ko'] as const).map(value => ({ value, label: languageLabels[value] }))} onSelect={value => select(() => settings.setLanguage(value))} onClose={() => setSelector(null)} /> : null}
    {selector === 'appearance' ? <SettingsSelectModal tone="dark" title={t('appearance')} value={settings.appearance} options={(['light', 'dark'] as const).map(value => ({ value, label: t(value) }))} onSelect={value => select(() => settings.setAppearance(value))} onClose={() => setSelector(null)} /> : null}
  </>;
}
