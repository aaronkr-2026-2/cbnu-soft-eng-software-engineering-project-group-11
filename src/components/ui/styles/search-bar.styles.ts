import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing, typography } from '../../../constants/theme';

export const createSearchBarStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 12,
  },
  icon: { width: 18, height: 18, marginRight: spacing.sm },
  iconGlyph: { color: colors.secondaryText, fontSize: 20, lineHeight: 20, textAlign: 'center' },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.body,
    height: '100%',
    padding: 0,
  },
});
