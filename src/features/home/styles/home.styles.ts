import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, typography } from '../../../constants/theme';

export const createHomeStyles = (colors: ThemeColors) => StyleSheet.create({
  scrollContent: {
    paddingBottom: 104,
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
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
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: 14 },
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
  },
  rollCount: {
    color: colors.secondaryText,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    letterSpacing: 0.8,
  },
  rollList: { gap: spacing.md },
  newRollButton: {
    bottom: 22,
    left: spacing.screen,
    position: 'absolute',
    right: spacing.screen,
  },
});
