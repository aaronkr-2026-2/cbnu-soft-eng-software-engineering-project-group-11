import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, typography } from '../../../constants/theme';

export const createRollDetailStyles = (colors: ThemeColors) => StyleSheet.create({
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  selectionContent: { paddingBottom: 160 },
  selectionNavigationSpacer: { height: 44 },
  filmHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  filmImage: { width: 60, aspectRatio: 1.23, borderRadius: 6, overflow: 'hidden' },
  container: { padding: spacing.lg, paddingTop: spacing.md }, back: { color: colors.text, fontSize: 17, marginBottom: spacing.xl },
  eyebrow: { color: colors.secondaryText, fontSize: 11, fontWeight: typography.weight.bold, letterSpacing: 1.2 }, title: { flexShrink: 1, color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold, letterSpacing: -0.4, marginTop: spacing.sm }, camera: { color: colors.secondaryText, fontSize: typography.size.label, marginTop: 6 },
  details: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xl }, detailRow: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 9, flexDirection: 'row', justifyContent: 'space-between', gap: 16 }, detailLabel: { color: colors.secondaryText, fontSize: typography.size.small, marginBottom: spacing.xs }, detailValue: { color: colors.text, flexShrink: 1, textAlign: 'right', fontSize: 15, fontWeight: typography.weight.medium },
  message: { color: colors.secondaryText, fontSize: typography.size.small, lineHeight: 18, marginTop: spacing.sm }, photoHeading: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.bold, letterSpacing: 1.25, marginTop: spacing.xl }, notFound: { marginTop: 60 }, description: { color: colors.secondaryText, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
});
