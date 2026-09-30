import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type ThemeColors } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';

type Props<T extends string> = {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};
export function SettingsSelectModal<T extends string>({ title, options, value, onSelect, onClose }: Props<T>) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  return <Modal transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.sheet}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.text}>{t('cancel')}</Text></Pressable>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      <ScrollView>{options.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: option.value === value }} accessibilityLabel={option.label} onPress={() => onSelect(option.value)} style={styles.row}>
        <Text style={styles.check}>{option.value === value ? '✓' : ''}</Text><Text style={styles.text}>{option.label}</Text>
      </Pressable>)}</ScrollView>
    </View></View>
  </Modal>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  cancel: { minHeight: 44, justifyContent: 'center', paddingRight: 24 },
  title: { color: colors.text, fontSize: 19, fontWeight: '600', flexShrink: 1 },
  text: { color: colors.text, fontSize: 17, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  check: { width: 32, color: colors.text, fontSize: 20 },
});
