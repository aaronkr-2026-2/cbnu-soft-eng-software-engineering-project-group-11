import { useLocalSearchParams, Redirect } from 'expo-router';
import { StorageSettings, SyncPhotosSettings } from '../../src/features/settings/components/SettingsDetails';
export default function SettingsDetail() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (section === 'storage') return <StorageSettings />;
  if (section === 'sync-photos') return <SyncPhotosSettings />;
  return <Redirect href="/settings" />;
}
