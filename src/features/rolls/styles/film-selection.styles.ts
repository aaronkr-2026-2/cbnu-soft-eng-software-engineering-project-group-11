import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, typography, radii } from '../../../constants/theme';
export const createFilmSelectionStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: spacing.screen, paddingBottom: 40 },
  title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: '600', marginVertical: 20 },
  brand: { color: colors.secondaryText, fontSize: 13, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  image: { width: 64, aspectRatio: 1.23, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text, fontSize: 17, fontWeight: '600' },
  secondary: { color: colors.secondaryText, fontSize: 13, marginTop: 5 },
  description: { flex: 1 },
  coverButton: { minHeight: 44, justifyContent: 'center' },
  selectButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  custom: { marginTop: 24, padding: 16, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
