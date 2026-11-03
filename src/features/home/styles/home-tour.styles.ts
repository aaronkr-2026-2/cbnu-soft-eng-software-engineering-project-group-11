import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, typography } from '../../../constants/theme';

export const createHomeTourStyles = (colors: ThemeColors) => StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.62)' },
  ring: { position: 'absolute', borderRadius: 14, borderWidth: 2, borderColor: '#FFFFFF' },
  card: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.background, borderRadius: 20, padding: 20,
    shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  step: { color: colors.secondaryText, fontSize: typography.size.micro, fontWeight: typography.weight.semibold, letterSpacing: 0.6 },
  title: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 6 },
  body: { color: colors.secondaryText, fontSize: 15, lineHeight: 21, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  skip: { minHeight: 44, justifyContent: 'center', paddingRight: 16 },
  skipText: { color: colors.secondaryText, fontSize: typography.size.label },
  next: { minHeight: 44, borderRadius: radii.pill, backgroundColor: colors.accent, paddingHorizontal: 22, justifyContent: 'center' },
  nextText: { color: colors.background, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
});
