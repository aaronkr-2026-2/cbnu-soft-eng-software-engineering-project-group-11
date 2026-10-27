import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, typography } from '../../../constants/theme';

export const createPhotoImportGuideStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 28, maxHeight: '90%' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  intro: { color: colors.secondaryText, fontSize: 15, lineHeight: 21, marginTop: 8, marginBottom: 8 },
  step: { flexDirection: 'row', gap: 14, paddingVertical: 14 },
  number: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  stepBody: { color: colors.secondaryText, fontSize: 14, lineHeight: 20, marginTop: 3 },
  actions: { gap: 4, paddingTop: 16 },
  secondary: { minHeight: 48, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
});
