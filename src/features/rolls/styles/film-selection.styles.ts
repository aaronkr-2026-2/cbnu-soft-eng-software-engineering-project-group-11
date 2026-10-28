import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, typography, radii } from '../../../constants/theme';
export const createFilmSelectionStyles = (colors: ThemeColors) => StyleSheet.create({
  layout: { flex: 1 },
  list: { flex: 1 },
  content: { padding: spacing.screen, paddingBottom: spacing.md },
  bottomBar: { flexShrink: 0, paddingHorizontal: spacing.screen, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: '600', marginVertical: 20 },
  brand: { color: colors.secondaryText, fontSize: 13, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  image: { width: 76, aspectRatio: 1.23, borderRadius: radii.sm, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.text, fontSize: 17, fontWeight: '600' },
  secondary: { color: colors.secondaryText, fontSize: 13, marginTop: 5 },
  description: { flex: 1 },
  coverButton: { minHeight: 44, justifyContent: 'center' },
  selectButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center' },
  // The A–Z strip lives in the right screen margin so it never covers a row.
  listArea: { flex: 1 },
  indexRail: { position: 'absolute', top: 0, bottom: 0, right: 0, width: spacing.screen, justifyContent: 'center' },
  index: { width: spacing.screen, maxHeight: 27 * 16, flexGrow: 1, flexShrink: 1, paddingVertical: 4 },
  indexSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  indexLetter: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  indexLetterEmpty: { color: colors.secondaryText, opacity: 0.45 },
  indexBubble: { position: 'absolute', alignSelf: 'center', top: '40%', width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  indexBubbleText: { color: colors.text, fontSize: 36, fontWeight: '700' },
  custom: { minHeight: 64, justifyContent: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
