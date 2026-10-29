import { useLocalSearchParams, Redirect } from 'expo-router';
import { StorageSettings, SyncPhotosSettings } from '../../src/features/settings/components/SettingsDetails';
import { TipsSettings } from '../../src/features/settings/components/TipsSettings';
import { tipsEnabled } from '../../src/constants/features';
export default function SettingsDetail() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (section === 'storage') return <StorageSettings />;
  if (section === 'sync-photos') return <SyncPhotosSettings />;
  if (section === 'support-development' && tipsEnabled) return <TipsSettings />;
  return <Redirect href="/settings" />;
}
