import { useTranslation } from '../../i18n/useTranslation';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useThemedStyles, type ThemeColors, radii, spacing, typography } from '../../constants/theme';

type MonthYearFieldProps = { label: string; onPress: () => void };

export function MonthYearField({ label, onPress }: MonthYearFieldProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return <Pressable accessibilityLabel={t('selectMonth')} accessibilityRole="button" onPress={onPress} style={styles.field}><Text style={styles.icon}>▣</Text><Text style={styles.label}>{label}</Text></Pressable>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  field: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: 13, paddingVertical: 13 },
  icon: { color: colors.secondaryText, fontSize: typography.size.label, marginRight: spacing.sm },
  label: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.medium },
});
