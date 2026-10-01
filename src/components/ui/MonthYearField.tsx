import { useTranslation } from '../../i18n/useTranslation';
import { Pressable, Text } from 'react-native';
import { useThemedStyles } from '../../constants/theme';
import { createMonthYearFieldStyles } from './styles/month-year-field.styles';

type MonthYearFieldProps = { label: string; onPress: () => void };

export function MonthYearField({ label, onPress }: MonthYearFieldProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createMonthYearFieldStyles);

  return <Pressable accessibilityLabel={t('selectMonth')} accessibilityRole="button" onPress={onPress} style={styles.field}><Text style={styles.icon}>▣</Text><Text style={styles.label}>{label}</Text></Pressable>;
}
