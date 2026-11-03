import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing, typography } from '../../../constants/theme';

export const createRollThumbnailStripStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.sm + 2, marginTop: spacing.md },
  thumbnail: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: 2,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spacer: { aspectRatio: 1, flex: 1 },
  image: { height: '100%', width: '100%' },
  unavailable: { color: colors.secondaryText, fontSize: typography.size.micro },
  moreOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  moreText: { color: '#FFFFFF', fontSize: typography.size.label, fontWeight: typography.weight.bold },
  empty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  emptyText: { color: colors.secondaryText, fontSize: typography.size.small },
});
