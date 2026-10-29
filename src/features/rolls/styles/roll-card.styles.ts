import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing, typography } from '../../../constants/theme';

export const createRollCardStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
  },
  pressed: { opacity: 0.75 },
  topRow: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  filmImage: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.sm,
    aspectRatio: 1.23,
    justifyContent: 'center',
    overflow: 'hidden',
    // Matches the height of the three text lines beside it.
    width: 80,
  },
  filmImageFill: { height: '100%', width: '100%' },
  filmImageText: { color: colors.secondaryText, fontSize: typography.size.caption, fontWeight: typography.weight.semibold },
  titleBlock: { flex: 1 },
  filmName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: typography.weight.semibold,
    letterSpacing: -0.3,
  },
  subtitle: { color: colors.secondaryText, fontSize: typography.size.body, marginTop: spacing.xxs },
  photoCount: {
    color: colors.secondaryText,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
});
