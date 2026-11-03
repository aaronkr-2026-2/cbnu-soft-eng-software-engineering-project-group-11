import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing, typography } from '../../../constants/theme';

export const createCameraCardStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, height: 210, padding: spacing.sm, width: 154 },
  selected: { borderColor: colors.text, borderWidth: 1.5 },
  imageArea: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, height: 112, justifyContent: 'center', marginBottom: spacing.sm, overflow: 'hidden' },
  image: { height: '100%', width: '100%' }, placeholder: { color: colors.secondaryText, fontSize: typography.size.micro, fontWeight: typography.weight.bold, letterSpacing: 1 },
  brand: { color: colors.secondaryText, fontSize: typography.size.small }, name: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold, marginTop: 1 }, meta: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.xxs },
});
