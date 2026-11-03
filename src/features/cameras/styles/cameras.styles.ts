import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing, typography } from '../../../constants/theme';

export const createCamerasStyles = (colors: ThemeColors) => StyleSheet.create({ content: { padding: spacing.screen, paddingTop: spacing.md }, back: { marginBottom: spacing.lg }, title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg }, add: { marginTop: spacing.xl, marginBottom: spacing.xl } });
