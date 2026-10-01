import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing, typography } from '../../../constants/theme';

export const createMonthYearFieldStyles = (colors: ThemeColors) => StyleSheet.create({
  field: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: 13, paddingVertical: 13 },
  icon: { color: colors.secondaryText, fontSize: typography.size.label, marginRight: spacing.sm },
  label: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.medium },
});
