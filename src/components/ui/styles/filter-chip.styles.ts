import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, typography } from '../../../constants/theme';

export const createFilterChipStyles = (colors: ThemeColors) => StyleSheet.create({
  chip: {
    flexShrink: 0,
    alignSelf: 'center',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  label: { color: colors.secondaryText, fontSize: typography.size.small, fontWeight: typography.weight.medium },
  selectedLabel: { color: colors.background },
});
