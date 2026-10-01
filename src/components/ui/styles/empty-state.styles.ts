import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing, typography } from '../../../constants/theme';

export const createEmptyStateStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 36,
  },
  title: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
  description: { color: colors.secondaryText, fontSize: 13, marginTop: spacing.xs },
});
