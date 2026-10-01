import { createSettingsStyles } from '../src/features/settings/styles/settings.styles';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from '../src/components/ui/BackButton';
import { Screen } from '../src/components/ui/Screen';
import { useThemedStyles } from '../src/constants/theme';
import { useAppStore } from '../src/store/app-store';
import { useTranslation } from '../src/i18n/useTranslation';
import { languageLabels } from '../src/i18n/translations';
import { SettingsSelectModal } from '../src/features/settings/components/SettingsSelectModal';
import { ImageCacheService } from '../src/features/photos/services/ImageCacheService';

export default function Settings() {
  const router = useRouter();

  function handleClose() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }
  const styles = useThemedStyles(createSettingsStyles);
  const { t } = useTranslation();
  const settings = useAppStore();
  const [selector, setSelector] = useState<'language' | 'appearance' | 'importMode' | null>(null);
  function select(save: () => void) {
    try { save(); setSelector(null); }
    catch { Alert.alert(t('settings'), t('saveError')); }
  }
  function clearCache() {
    Alert.alert(t('clearTitle'), t('clearMessage'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('clear'), style: 'destructive', onPress: async () => {
        await ImageCacheService.clear();
        Alert.alert(t('clearImageCache'), t('cacheEmpty'));
      } },
    ]);
  }
  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><BackButton onPress={handleClose} /><Text style={styles.title}>{t('settings')}</Text><View style={styles.spacer} /></View>
    <Group title={t('language')}><Row label={t('language')} value={languageLabels[settings.language]} onPress={() => setSelector('language')} /></Group>
    <Group title={t('appearance')}><Row label={t('appearance')} value={t(settings.appearance)} onPress={() => setSelector('appearance')} /></Group>
    <Group title={t('storage')}>
      <Row label={t('importPhotos')} value={t(settings.importMode)} onPress={() => setSelector('importMode')} />
      <Row label={t('clearImageCache')} destructive onPress={clearCache} />
    </Group>
    {settings.importMode === 'copy' ? <Text style={styles.note}>{t('copyUnavailable')}</Text> : null}
  </ScrollView>
    {selector === 'language' ? <SettingsSelectModal title={t('language')} value={settings.language} options={(['vi', 'en', 'ko'] as const).map((value) => ({ value, label: languageLabels[value] }))} onSelect={(value) => select(() => settings.setLanguage(value))} onClose={() => setSelector(null)} /> : null}
    {selector === 'appearance' ? <SettingsSelectModal title={t('appearance')} value={settings.appearance} options={(['light', 'dark'] as const).map((value) => ({ value, label: t(value) }))} onSelect={(value) => select(() => settings.setAppearance(value))} onClose={() => setSelector(null)} /> : null}
    {selector === 'importMode' ? <SettingsSelectModal title={t('importPhotos')} value={settings.importMode} options={(['reference', 'copy'] as const).map((value) => ({ value, label: t(value) }))} onSelect={(value) => select(() => settings.setImportMode(value))} onClose={() => setSelector(null)} /> : null}
  </Screen>;
}
function Group({ title, children }: { title: string; children: ReactNode }) {
  const styles = useThemedStyles(createSettingsStyles);
  return <View style={styles.group}><Text accessibilityRole="header" style={styles.heading}>{title.toLocaleUpperCase()}</Text><View style={styles.card}>{children}</View></View>;
}
function Row({ label, value, onPress, destructive = false }: { label: string; value?: string; onPress: () => void; destructive?: boolean }) {
  const styles = useThemedStyles(createSettingsStyles);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityValue={value ? { text: value } : undefined} onPress={onPress} style={styles.row}>
    <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
    {value ? <><Text style={styles.value}>{value}</Text><Text style={styles.value}>›</Text></> : null}
  </Pressable>;
}
