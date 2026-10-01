import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing, typography } from '../../../constants/theme';

export const itemHeight = 38;

export const createMonthYearPickerStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { backgroundColor: colors.backdrop, flex: 1, justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: spacing.lg }, drag: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: radii.pill, height: 4, marginTop: spacing.sm, width: 38 }, top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md }, action: { color: colors.secondaryText, fontSize: typography.size.body }, done: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold }, title: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold }, wheels: { flexDirection: 'row', height: itemHeight * 5, paddingHorizontal: spacing.xl }, wheel: { flex: 1, overflow: 'hidden' }, selection: { backgroundColor: colors.surface, borderRadius: radii.md, height: itemHeight, left: 0, position: 'absolute', right: 0, top: itemHeight * 2, zIndex: -1 }, row: { alignItems: 'center', height: itemHeight, justifyContent: 'center' }, rowText: { color: colors.secondaryText, fontSize: typography.size.label }, selectedText: { color: colors.text, fontWeight: typography.weight.semibold }, preview: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.md, textAlign: 'center' },
  wheelPadding: { paddingVertical: itemHeight * 2 },
});
