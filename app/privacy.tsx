import { createSettingsStyles } from '../src/features/settings/styles/settings.styles';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton } from '../src/components/ui/BackButton';
import { Screen } from '../src/components/ui/Screen';
import { useThemedStyles } from '../src/constants/theme';
import { useTranslation } from '../src/i18n/useTranslation';
import type { TranslationKey } from '../src/i18n/translations';

const sections: [TranslationKey, TranslationKey][] = [
  ['privacyLocalTitle', 'privacyLocalBody'],
  ['privacyPhotosTitle', 'privacyPhotosBody'],
  ['privacyLocationTitle', 'privacyLocationBody'],
  ['privacySharingTitle', 'privacySharingBody'],
  ['privacyRemovalTitle', 'privacyRemovalBody'],
];

export default function Privacy() {
  const router = useRouter();
  const styles = useThemedStyles(createSettingsStyles);
  const { t } = useTranslation();

  function handleClose() {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  }

  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><BackButton onPress={handleClose} /><Text accessibilityRole="header" style={styles.title}>{t('privacyData')}</Text><View style={styles.spacer} /></View>
    <Text style={styles.note}>{t('privacyIntro')}</Text>
    {sections.map(([title, body]) => <View key={title} style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>{t(title).toLocaleUpperCase()}</Text>
      <View style={[styles.card, styles.textCard]}><Text style={styles.body}>{t(body)}</Text></View>
    </View>)}
  </ScrollView></Screen>;
}
