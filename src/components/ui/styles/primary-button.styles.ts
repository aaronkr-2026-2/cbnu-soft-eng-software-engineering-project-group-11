import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, typography } from '../../../constants/theme';

export const createPrimaryButtonStyles = (colors: ThemeColors) => StyleSheet.create({
  disabled: { opacity: 0.45 },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  label: { color: colors.background, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
});
