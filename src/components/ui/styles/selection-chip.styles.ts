import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, typography } from '../../../constants/theme';

export const createSelectionChipStyles = (colors: ThemeColors) => StyleSheet.create({
  chip: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, minWidth: 48, paddingHorizontal: 12, paddingVertical: 10 },
  selected: { backgroundColor: colors.text, borderColor: colors.text },
  label: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.semibold },
  selectedLabel: { color: colors.background },
});
