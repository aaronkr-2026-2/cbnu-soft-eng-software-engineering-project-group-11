import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, radii, typography } from '../../../constants/theme';
export const createRollFormStyles = (colors: ThemeColors) => StyleSheet.create({
  cancel: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  content: { padding: spacing.screen, paddingBottom: 40 },
  title: { fontSize: typography.size.screenTitle, fontWeight: '600', color: colors.text, marginVertical: 20 },
  film: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  image: { width: 66, aspectRatio: 1.23, overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  filmEdit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 44 },
  filmText: { flex: 1 }, name: { color: colors.text, fontSize: 19, fontWeight: '600' },
  secondary: { color: colors.secondaryText, fontSize: 14, marginTop: 5 },
  heading: { color: colors.secondaryText, fontSize: 12, marginTop: 26, marginBottom: 10, letterSpacing: 1 },
  group: { borderRadius: radii.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { color: colors.text, fontSize: 16 }, value: { color: colors.secondaryText, fontSize: 15, flex: 1, textAlign: 'right' },
  action: { marginTop: 28 }, error: { color: colors.destructive, marginTop: 12 },
  input: { color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: 14, marginTop: 16, minHeight: 48 },
});
