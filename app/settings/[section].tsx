import { useLocalSearchParams, Redirect } from 'expo-router';
import { StorageSettings, SyncPhotosSettings } from '../../src/features/settings/components/SettingsDetails';
import { TipsSettings } from '../../src/features/settings/components/TipsSettings';
export default function SettingsDetail() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (section === 'storage') return <StorageSettings />;
  if (section === 'sync-photos') return <SyncPhotosSettings />;
  if (section === 'support-development') return <TipsSettings />;
  return <Redirect href="/settings" />;
}
