import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { useThemedStyles } from '../../../constants/theme';
import type { TranslationKey } from '../../../i18n/translations';
import { useTranslation } from '../../../i18n/useTranslation';
import { createPhotoImportGuideStyles } from '../styles/photo-import-guide.styles';

const steps: [TranslationKey, TranslationKey][] = [
  ['photoGuideLinkTitle', 'photoGuideLinkBody'],
  ['photoGuideAccessTitle', 'photoGuideAccessBody'],
  ['photoGuideOrderTitle', 'photoGuideOrderBody'],
  ['photoGuideKeepTitle', 'photoGuideKeepBody'],
];

type Props = { visible: boolean; onContinue: () => void; onClose: () => void; onDismiss?: () => void };

/** Shown before the first Photos permission prompt so the reference model and Full Access choice are explained. */
export function PhotoImportGuide({ visible, onContinue, onClose, onDismiss }: Props) {
  const styles = useThemedStyles(createPhotoImportGuideStyles);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onDismiss={onDismiss}>
    <View style={styles.backdrop}><View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView bounces={false}>
        <Text accessibilityRole="header" style={styles.title}>{t('photoGuideTitle')}</Text>
        <Text style={styles.intro}>{t('photoGuideIntro')}</Text>
        {steps.map(([title, body], index) => <View key={title} style={styles.step} accessible accessibilityLabel={`${t(title)}. ${t(body)}`}>
          <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
          <View style={styles.stepCopy}>
            <Text style={styles.stepTitle}>{t(title)}</Text>
            <Text style={styles.stepBody}>{t(body)}</Text>
          </View>
        </View>)}
      </ScrollView>
      <View style={styles.actions}>
        <PrimaryButton label={t('photoGuideContinue')} onPress={onContinue} />
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondary}>
          <Text style={styles.secondaryText}>{t('photoGuideNotNow')}</Text>
        </Pressable>
      </View>
    </View></View>
  </Modal>;
}
