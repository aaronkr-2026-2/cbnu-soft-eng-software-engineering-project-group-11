import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, typography } from '../../../constants/theme';

export const createHomeStyles = (colors: ThemeColors) => StyleSheet.create({
  browseHeader: {
    flexShrink: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
  },
  resultsScroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 104,
    paddingHorizontal: spacing.screen,
  },
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  wordmark: {
    color: colors.text,
    fontSize: typography.size.title,
    fontWeight: typography.weight.bold,
    letterSpacing: 2.4,
  },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  archiveLabel: {
    color: colors.secondaryText,
    fontSize: typography.size.micro,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1.1,
  },
  browseSelector: { height: 44, flexGrow: 0, flexShrink: 0, marginTop: 14 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 1 },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
    marginTop: 31,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.size.small,
    fontWeight: typography.weight.bold,
    letterSpacing: 1.25,
    flex: 1,
    marginRight: spacing.sm,
  },
  rollCount: {
    color: colors.secondaryText,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
  },
  rollList: { gap: spacing.md },
  emptyState: { marginTop: 31 },
  newRollButton: {
    bottom: 22,
    left: spacing.screen,
    position: 'absolute',
    right: spacing.screen,
  },
});
