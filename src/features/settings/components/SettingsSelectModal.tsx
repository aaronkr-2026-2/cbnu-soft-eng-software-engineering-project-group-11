import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { createSettingsSelectModalStyles } from '../styles/settings-select-modal.styles';

type Props<T extends string> = {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};
export function SettingsSelectModal<T extends string>({ title, options, value, onSelect, onClose }: Props<T>) {
  const styles = useThemedStyles(createSettingsSelectModalStyles);
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
