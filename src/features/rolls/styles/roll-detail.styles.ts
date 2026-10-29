import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, typography } from '../../../constants/theme';

export const createRollDetailStyles = (colors: ThemeColors) => StyleSheet.create({
  // Pinned bar shown while browsing photos: same buttons, compact cover and name in the middle.
  pinnedBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 8, backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pinnedTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pinnedImage: { width: 30, aspectRatio: 1.23, borderRadius: 4, overflow: 'hidden' },
  pinnedText: { flexShrink: 1, color: colors.text, fontSize: 16, fontWeight: typography.weight.semibold },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  photoHint: { color: colors.secondaryText, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  selectionContent: { paddingBottom: 160 },
  selectionNavigationSpacer: { height: 44 },
  filmHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fill: { width: '100%', height: '100%' },
  filmImage: { width: 60, aspectRatio: 1.23, borderRadius: 6, overflow: 'hidden' },
  container: { padding: spacing.lg, paddingTop: spacing.md }, back: { color: colors.text, fontSize: 17, marginBottom: spacing.xl },
  eyebrow: { color: colors.secondaryText, fontSize: 11, fontWeight: typography.weight.bold, letterSpacing: 1.2 }, title: { flexShrink: 1, color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold, letterSpacing: -0.4, marginTop: spacing.sm }, camera: { color: colors.secondaryText, fontSize: typography.size.label, marginTop: 6 },
  // Spec card: 3 columns × 2 rows like a camera spec sheet.
  specs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xl, borderRadius: 14, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  specCell: { width: '33.333%', minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  specDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
  specRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  specLabel: { color: colors.secondaryText, fontSize: 10, fontWeight: typography.weight.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  specValue: { color: colors.text, fontSize: 15, fontWeight: typography.weight.semibold },
  specSmall: { color: colors.secondaryText, fontSize: 12 },
  badge: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, fontSize: 11, fontWeight: typography.weight.bold, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.background },
  badgeInDate: { backgroundColor: colors.success },
  badgeExpired: { backgroundColor: colors.destructive },
  // Info list under the spec card: same surface and radius, one icon per row.
  infoCard: { marginTop: spacing.md, borderRadius: 14, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  infoDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  infoPressed: { opacity: 0.6 },
  infoIcon: { width: 18, alignItems: 'center' },
  infoText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 20 },
  infoMuted: { color: colors.secondaryText, fontSize: 13 },
  message: { color: colors.secondaryText, fontSize: typography.size.small, lineHeight: 18, marginTop: spacing.sm }, photoHeading: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.bold, letterSpacing: 1.25, marginTop: spacing.xl }, notFound: { marginTop: 60 }, description: { color: colors.secondaryText, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
});
