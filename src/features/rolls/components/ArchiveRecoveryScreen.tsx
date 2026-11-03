import { useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { exportRawArchive } from '../services/ArchiveRecoveryService';
import { Screen } from '../../../components/ui/Screen';
import { useTranslation } from '../../../i18n/useTranslation';
import { useRollStore } from '../store/rollStore';
import { useTheme } from '../../../constants/theme';

export function ArchiveRecoveryScreen({ archiveOverride, onRetry, catalog = false }: {
  archiveOverride?: { status: 'recovery'; raw?: string; reason: string }; onRetry?: () => void; catalog?: boolean;
} = {}) {
  const { t } = useTranslation();
  const colors = useTheme();
  const rollArchive = useRollStore(state => state.archive);
  const archive = archiveOverride ?? rollArchive;
  const rollRetry = useRollStore(state => state.retryLoad);
  const retry = onRetry ?? rollRetry;
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function exportRaw() {
    if (archive.status !== 'recovery' || archive.raw === undefined || busy) return;
    setBusy(true); setError(false);
    try {
      await exportRawArchive(archive.raw);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <Screen><ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24 }}>{t(catalog ? 'catalogRecoveryTitle' : 'archiveRecoveryTitle')}</Text>
    <Text style={{ color: colors.text }}>{t(catalog ? 'catalogRecoveryMessage' : 'archiveRecoveryMessage')}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={retry} style={{ paddingVertical: 12 }}><Text style={{ color: colors.text }}>{t('photoRetry')}</Text></Pressable>
    {archive.status === 'recovery' && archive.raw !== undefined ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void exportRaw()} style={{ paddingVertical: 12 }}><Text style={{ color: colors.text }}>{t('archiveExportRaw')}</Text></Pressable> : null}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.text }}>{t('archiveExportError')}</Text> : null}
  </ScrollView></Screen>;
}
